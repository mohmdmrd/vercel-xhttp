export const config = { runtime: "edge" };

export default async function handler(req) {

	const UPSTREAM = (process.env.UPSTREAM || "");
	const VERCEL_PREFIX = (process.env.VERCEL_PREFIX || "");

	const STRIP_HEADERS = new Set([
		"host",
		"connection",
		"keep-alive",
		"proxy-authenticate",
		"proxy-authorization",
		"te",
		"trailer",
		"transfer-encoding",
		"upgrade",
		"forwarded",
		"x-forwarded-host",
		"x-forwarded-proto",
		"x-forwarded-port",
	]);


  try {
    const pathStart = req.url.indexOf("/", 8);
    const targetUrl =
      pathStart === -1 ? UPSTREAM : UPSTREAM + req.url.slice(pathStart).replace(VERCEL_PREFIX, "");

    const out = new Headers();
    let clientIp = null;
    for (const [k, v] of req.headers) {
      if (STRIP_HEADERS.has(k)) continue;
      if (k.startsWith("x-vercel-")) continue;
      if (k === "x-real-ip") {
        clientIp = v;
        continue;
      }
      if (k === "x-forwarded-for") {
        if (!clientIp) clientIp = v;
        continue;
      }
      out.set(k, v);
    }
    if (clientIp) out.set("x-forwarded-for", clientIp);

    const method = req.method;
    const hasBody = method !== "GET" && method !== "HEAD";

    return await fetch(targetUrl, {
      method,
      headers: out,
      body: hasBody ? req.body : undefined,
      duplex: "half",
      redirect: "manual",
    });
  } catch (err) {
    return new Response("502", { status: 502 });
  }
}
