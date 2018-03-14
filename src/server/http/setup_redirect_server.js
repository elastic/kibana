import { format as formatUrl } from 'url';
import { fromNode } from 'bluebird';
import Hapi from 'hapi';

// If a redirect port is specified, we start an http server at this port and
// redirect all requests to the ssl port.
export async function setupRedirectServer(config) {
  const isSslEnabled = config.get('server.ssl.enabled');
  const portToRedirectFrom = config.get('server.ssl.redirectHttpFromPort');

  // Both ssl and port to redirect from must be specified
  if (!isSslEnabled || portToRedirectFrom === undefined) {
    return;
  }

  const host = config.get('server.host');
  const sslPort = config.get('server.port');

  if (portToRedirectFrom === sslPort) {
    throw new Error(
      'Kibana does not accept http traffic to `server.port` when ssl is ' +
      'enabled (only https is allowed), so `server.ssl.redirectHttpFromPort` ' +
      `cannot be configured to the same value. Both are [${sslPort}].`
    );
  }

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

  try {
    await fromNode(cb => redirectServer.start(cb));
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      throw new Error(
        'The redirect server failed to start up because port ' +
        `${portToRedirectFrom} is already in use. Ensure the port specified ` +
        'in `server.ssl.redirectHttpFromPort` is available.'
      );
    } else {
      throw err;
    }
  }
}
