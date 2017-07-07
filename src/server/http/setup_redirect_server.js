import { format as formatUrl } from 'url';
import Hapi from 'hapi';

// If a redirect port is specified, we start an http server at this port and
// redirect all requests to the ssl port.
export default function (kbnServer, server, config) {
  const isSslEnabled = config.get('server.ssl.enabled');
  const portToRedirectFrom = config.get('server.ssl.redirectHttpFromPort');

  // Both ssl and port to redirect from must be specified
  if (!isSslEnabled || portToRedirectFrom === undefined) {
    return;
  }

  const host = config.get('server.host');
  const sslPort = config.get('server.port');

  const redirectServer = new Hapi.Server();

  redirectServer.connection({
    host,
    port: portToRedirectFrom
  });

  redirectServer.ext('onRequest', (req, reply) => {
    reply.redirect(formatUrl({
      protocol: 'https',
      hostname: host,
      port: sslPort,
      pathname: req.url.pathname,
      search: req.url.search,
    }));
  });

  redirectServer.start((err) => {
    if (err) {
      throw err;
    }
  });
}
