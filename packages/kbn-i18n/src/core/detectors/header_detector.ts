export function headerDetector(req: any) {
  const locales = [];

  if (typeof req !== 'undefined') {
    const headers = req.headers;
    if (!headers) return;

    const acceptLanguage = headers['accept-language'];

    if (acceptLanguage) {
      let m;
      const lngs = [];
      const rgx = /(([a-z]{2})-?([A-Z]{2})?)\s*;?\s*(q=([0-9.]+))?/gi;

      do {
        m = rgx.exec(acceptLanguage);
        if (m) {
          const lng = m[1], weight = m[5] || '1', q = +weight;
          if (lng && !isNaN(q)) {
            lngs.push({lng, q});
          }
        }
      } while (m);

      lngs.sort((a,b) => b.q - a.q);

      for (let i = 0, l = lngs.length; i < l; i++) {
        locales.push(lngs[i].lng);
      }
    }
  }

  return locales.length? locales : undefined;
}
