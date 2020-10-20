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

import Http from 'http';
import * as kbnTestServer from '../../../test_helpers/kbn_server';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
describe('issue-73849', () => {
  let root: ReturnType<typeof kbnTestServer.createRoot>;
  beforeAll(async () => {
    root = kbnTestServer.createRoot({
      server: {
        keepaliveTimeout: 10_000,
      },
      plugins: { initialize: false },
    });
  }, 30000);

  afterAll(async () => await root.shutdown());
  it('headers timeout is handled correctly', async () => {
    const { http } = await root.setup();
    const { server: innerServer, createRouter } = http;
    const oneSec = 1_000;
    // hacks to speed up the test

    const router = createRouter('/test');

    router.get({ path: '/', validate: false }, async (context, request, res) => {
      return res.ok({ body: 'ok' });
    });

    await root.start();

    const agent = new Http.Agent({
      keepAlive: true,
    });

    function performRequest() {
      return new Promise((resolve, reject) => {
        const req = Http.request(
          {
            protocol: 'http:',
            host: 'localhost',
            port: 5601,
            path: '/',
            method: 'GET',
            agent,
          },
          function (res) {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk;
            });
            res.on('end', () => resolve(data));
          }
        );

        req.on('socket', (socket) => {
          socket.write('GET / HTTP/1.1\r\n');
          setTimeout(() => {
            socket.write('Host: localhost\r\n');
          }, oneSec);
          setTimeout(() => {
            // headersTimeout doesn't seem to fire if request headers are sent in one packet.
            socket.write('\r\n');
            req.end();
          }, 2 * oneSec);
        });

        req.on('error', reject);
      });
    }

    await performRequest();
    await delay(innerServer.listener.headersTimeout + oneSec);
    await performRequest();
  });
});
