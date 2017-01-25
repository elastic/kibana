import { readFileSync } from 'fs';
import { format as formatUrl } from 'url';
import httpolyglot from 'httpolyglot';
import { map } from 'lodash';
import secureOptions from './secure_options';

const getClientAuthenticationHttpOptions = (clientAuthentication) => {
  switch (clientAuthentication) {
    case 'none':
      return {
        requestCert: false,
        rejectUnauthorized: false
      };
    case 'required':
      return {
        requestCert: true,
        rejectUnauthorized: true
      };
    default:
      throw new Error(`Unknown clientAuthentication option: ${clientAuthentication}`);
  }
};

export default function (kbnServer, server, config) {
  // this mixin is used outside of the kbn server, so it MUST work without a full kbnServer object.
  kbnServer = null;

  const host = config.get('server.host');
  const port = config.get('server.port');

  const connectionOptions = {
    host,
    port,
    state: {
      strictHeader: false
    },
    routes: {
      cors: config.get('server.cors'),
      payload: {
        maxBytes: config.get('server.maxPayloadBytes')
      }
    }
  };

  const useSsl = config.get('server.ssl.enabled');

  // not using https? well that's easy!
  if (!useSsl) {
    server.connection(connectionOptions);
    return;
  }

  const { requestCert, rejectUnauthorized } = getClientAuthenticationHttpOptions(config.get('server.ssl.clientAuthentication'));

  server.connection({
    ...connectionOptions,
    tls: true,
    listener: httpolyglot.createServer({
      key: readFileSync(config.get('server.ssl.key')),
      cert: readFileSync(config.get('server.ssl.certificate')),
      ca: map(config.get('server.ssl.certificateAuthorities'), readFileSync),
      passphrase: config.get('server.ssl.keyPassphrase'),

      ciphers: config.get('server.ssl.cipherSuites').join(':'),
      // We use the server's cipher order rather than the client's to prevent the BEAST attack
      honorCipherOrder: true,
      requestCert,
      rejectUnauthorized,
      secureOptions: secureOptions(config.get('server.ssl.supportedProtocols'))
    })
  });

  server.ext('onRequest', function (req, reply) {
    // A request sent through a HapiJS .inject() doesn't have a socket associated with the request
    // which causes a failure.
    if (!req.raw.req.socket || req.raw.req.socket.encrypted) {
      reply.continue();
    } else {
      reply.redirect(formatUrl({
        port,
        protocol: 'https',
        hostname: host,
        pathname: req.url.pathname,
        search: req.url.search,
      }));
    }
  });
}
