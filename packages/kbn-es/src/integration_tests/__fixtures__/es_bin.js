#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const fs = require('fs');
const { format: formatUrl } = require('url');
const { exitCode, start, ssl } = JSON.parse(process.argv[2]);
const { createServer } = ssl ? require('https') : require('http');
const { ES_KEY_PATH, ES_CERT_PATH } = require('@kbn/dev-utils');

(function main() {
  process.exitCode = exitCode;

  if (!start) {
    return;
  }

  let serverUrl;
  const server = createServer(
    {
      // Note: the integration uses the ES_P12_PATH, but that keystore contains
      // the same key/cert as ES_KEY_PATH and ES_CERT_PATH
      key: ssl ? fs.readFileSync(ES_KEY_PATH) : undefined,
      cert: ssl ? fs.readFileSync(ES_CERT_PATH) : undefined,
    },
    (req, res) => {
      const url = new URL(req.url, serverUrl);
      const send = (code, body) => {
        res.writeHead(code, { 'content-type': 'application/json' });
        res.end(JSON.stringify(body));
      };

      if (url.pathname === '/_xpack') {
        return send(400, {
          error: {
            reason: 'foo bar',
          },
        });
      }

      return send(404, {
        error: {
          reason: 'not found',
        },
      });
    }
  );

  // setup server auto close after 1 second of silence
  let serverCloseTimer;
  const delayServerClose = () => {
    clearTimeout(serverCloseTimer);
    serverCloseTimer = setTimeout(() => server.close(), 1000);
  };
  server.on('request', delayServerClose);
  server.on('listening', delayServerClose);

  server.listen(0, '127.0.0.1', function () {
    const { port, address: hostname } = server.address();
    serverUrl = new URL(
      formatUrl({
        protocol: 'http:',
        port,
        hostname,
      })
    );

    console.log(
      `[o.e.h.AbstractHttpServerTransport] [computer] publish_address {127.0.0.1:${port}}, bound_addresses {[::1]:${port}}, {127.0.0.1:${port}}`
    );

    console.log('started');
  });
})();
