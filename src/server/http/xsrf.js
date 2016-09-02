import { badRequest } from 'boom';

export default function (kbnServer, server, config) {
  const disabled = config.get('server.xsrf.disableProtection');
  // COMPAT: We continue to check on the kbn-version header for backwards
  // compatibility since all existing consumers have been required to use it.
  const versionHeader = 'kbn-version';
  const xsrfHeader = 'kbn-xsrf';

  server.ext('onPostAuth', function (req, reply) {
    if (disabled) {
      return reply.continue();
    }

    const isSafeMethod = req.method === 'get' || req.method === 'head';
    const hasVersionHeader = versionHeader in req.headers;
    const hasXsrfHeader = xsrfHeader in req.headers;

    if (!isSafeMethod && !hasVersionHeader && !hasXsrfHeader) {
      return reply(badRequest(`Request must contain an ${xsrfHeader} header`));
    }

    return reply.continue();
  });
}
