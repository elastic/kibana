#!/usr/bin/env node

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

const { createServer } = require('http');
const { format: formatUrl } = require('url');
const { exitCode, start } = JSON.parse(process.argv[2]);

process.exitCode = exitCode;

if (!start) {
  return;
}

let serverUrl;
const server = createServer((req, res) => {
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
});

// setup server auto close after 1 second of silence
let serverCloseTimer;
const delayServerClose = () => {
  clearTimeout(serverCloseTimer);
  serverCloseTimer = setTimeout(() => server.close(), 1000);
};
server.on('request', delayServerClose);
server.on('listening', delayServerClose);

server.listen(0, '127.0.0.1', function() {
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
