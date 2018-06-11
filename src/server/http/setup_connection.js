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
    const connection = server.connection(connectionOptions);

    // revert to previous 5m keepalive timeout in Node < 8
    connection.listener.keepAliveTimeout = 120e3;

    return;
  }

  const connection = server.connection({
    ...connectionOptions,
    tls: {
      key: readFileSync(config.get('server.ssl.key')),
      cert: readFileSync(config.get('server.ssl.certificate')),
      ca: config.get('server.ssl.certificateAuthorities').map(ca => readFileSync(ca, 'utf8')),
      passphrase: config.get('server.ssl.keyPassphrase'),

      ciphers: config.get('server.ssl.cipherSuites').join(':'),
      // We use the server's cipher order rather than the client's to prevent the BEAST attack
      honorCipherOrder: true,
      secureOptions: secureOptions(config.get('server.ssl.supportedProtocols'))
    }
  });

  // revert to previous 5m keepalive timeout in Node < 8
  connection.listener.keepAliveTimeout = 120e3;

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
