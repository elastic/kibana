import { readFileSync } from 'fs';
import secureOptions from './secure_options';

export function setupConnection(server, config, newPlatform) {
  const newPlatformProxyListener = newPlatform && newPlatform.proxyListener;

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
      },
      validate: {
        options: {
          abortEarly: false
        }
      }
    },
    listener: newPlatformProxyListener
  };

  const useSsl = config.get('server.ssl.enabled');

  // not using https? well that's easy!
  if (!useSsl) {
    server.connection(connectionOptions);
    return;
  }

  const tlsOptions = {};
  const keystoreConfig = config.get('server.ssl.keystore.path');
  const pemConfig = config.get('server.ssl.certificate');

  if (keystoreConfig && pemConfig) {
    throw new Error(`Invalid Configuration: please specify either "server.ssl.keystore.path" or "server.ssl.certificate", not both.`);
  }

  if (keystoreConfig) {
    tlsOptions.pfx = readFileSync(keystoreConfig);
    tlsOptions.passphrase = config.get('server.ssl.keystore.password');
  } else {
    tlsOptions.key = readFileSync(config.get('server.ssl.key'));
    tlsOptions.cert = readFileSync(pemConfig);
    tlsOptions.passphrase = config.get('server.ssl.keyPassphrase');
  }

  const connection = server.connection({
    ...connectionOptions,
    tls: {
      ...tlsOptions,
      ca: config.get('server.ssl.certificateAuthorities').map(ca => readFileSync(ca, 'utf8')),
      ciphers: config.get('server.ssl.cipherSuites').join(':'),
      // We use the server's cipher order rather than the client's to prevent the BEAST attack
      honorCipherOrder: true,
      secureOptions: secureOptions(config.get('server.ssl.supportedProtocols'))
    }
  });

  const badRequestResponse = new Buffer('HTTP/1.1 400 Bad Request\r\n\r\n', 'ascii');
  connection.listener.on('clientError', (err, socket) => {
    if (socket.writable) {
      socket.end(badRequestResponse);
    }
    else {
      socket.destroy(err);
    }
  });
}
