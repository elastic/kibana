#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
      const send = (code, body, headers = {}) => {
        res.writeHead(code, { 'content-type': 'application/json', ...headers });
        res.end(JSON.stringify(body));
      };

      // ES client's Product check request: it checks some fields in the body and the header
      if (url.pathname === '/') {
        return send(
          200,
          {
            name: 'es-bin',
            cluster_name: 'elasticsearch',
            cluster_uuid: 'k0sr2gr9S4OBtygmu9ndzA',
            version: {
              number: '8.0.0-SNAPSHOT',
              build_flavor: 'default',
              build_type: 'tar',
              build_hash: 'b11c15b7e0af64f90c3eb9c52c2534b4f143a070',
              build_date: '2021-08-03T19:32:39.781056185Z',
              build_snapshot: true,
              lucene_version: '8.9.0',
              minimum_wire_compatibility_version: '7.15.0',
              minimum_index_compatibility_version: '7.0.0',
            },
            tagline: 'You Know, for Search',
          },
          { 'x-elastic-product': 'Elasticsearch' }
        );
      }

      if (url.pathname === '/_xpack') {
        return send(400, {
          error: {
            reason: 'foo bar',
          },
        });
      }

      if (url.pathname === '/_cluster/health') {
        return send(
          200,
          {
            status: 'green',
          },
          { 'x-elastic-product': 'Elasticsearch' }
        );
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
