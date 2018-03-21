import { readFileSync } from 'fs';
import secureOptions from './secure_options';

export function setupConnection(server, config) {
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
    }
  };

  const useSsl = config.get('server.ssl.enabled');

  // not using https? well that's easy!
  if (!useSsl) {
    server.connection(connectionOptions);
    return;
  }

  const tlsOptions = {};
  const pfxConfig = config.get('server.ssl.pfx');
  const pemConfig = config.get('server.ssl.certificate');

  if (pfxConfig && pemConfig) {
    throw new Error(`Invalid Configuration: please specify either "server.ssl.pfx" or "server.ssl.certificate", not both.`);
  }

  if (pfxConfig) {
    tlsOptions.pfx = readFileSync(pfxConfig);
  } else {
    tlsOptions.key = readFileSync(config.get('server.ssl.key'));
    tlsOptions.cert = readFileSync(pemConfig);
  }

  const connection = server.connection({
    ...connectionOptions,
    tls: {
      ...tlsOptions,
      ca: config.get('server.ssl.certificateAuthorities').map(ca => readFileSync(ca, 'utf8')),
      passphrase: config.get('server.ssl.keyPassphrase'),
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
