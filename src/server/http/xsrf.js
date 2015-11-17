import { forbidden } from 'boom';

export default function (kbnServer, server, config) {
  const token = config.get('server.xsrf.token');
  const disabled = config.get('server.xsrf.disableProtection');

  server.decorate('reply', 'issueXsrfToken', function () {
    return token;
  });

  server.ext('onPostAuth', function (req, reply) {
    if (disabled || req.method === 'get') return reply.continue();

    const attempt = req.headers['kbn-xsrf-token'];
    if (!attempt) return reply(forbidden('Missing XSRF token'));
    if (attempt !== token) return reply(forbidden('Invalid XSRF token'));

    return reply.continue();
  });
}
