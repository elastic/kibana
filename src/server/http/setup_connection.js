/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

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
