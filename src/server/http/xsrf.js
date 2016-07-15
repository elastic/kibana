import { badRequest } from 'boom';

export default function (kbnServer, server, config) {
  const version = config.get('pkg.version');
  const disabled = config.get('server.xsrf.disableProtection');
  const header = 'kbn-version';

  server.ext('onPostAuth', function (req, reply) {
    const noHeaderGet = (req.method === 'get' || req.method === 'head') && !req.headers[header];
    if (disabled || noHeaderGet) return reply.continue();

    const submission = req.headers[header];
    if (!submission) return reply(badRequest(`Missing ${header} header`));
    if (submission !== version) {
      return reply(badRequest('Browser client is out of date, please refresh the page', {
        expected: version,
        got: submission
      }));
    }

    return reply.continue();
  });
}
