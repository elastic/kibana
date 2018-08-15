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

import * as kbnTestServer from '../../test_utils/kbn_server';

let kbnServer;
async function makeServer({ maxPayloadBytesDefault, maxPayloadBytesRoute }) {
  kbnServer = kbnTestServer.createServer({
    server: { maxPayloadBytes: maxPayloadBytesDefault }
  });

  await kbnServer.ready();

  kbnServer.server.route({
    path: '/payload_size_check/test/route',
    method: 'POST',
    config: { payload: { maxBytes: maxPayloadBytesRoute } },
    handler: function (req, reply) {
      reply(null, req.payload.data.slice(0, 5));
    }
  });
}

async function makeRequest(opts) {
  return await kbnTestServer.makeRequest(kbnServer, opts);
}

afterEach(async () => await kbnServer.close());

test('accepts payload with a size larger than default but smaller than route config allows', async () => {
  await makeServer({ maxPayloadBytesDefault: 100, maxPayloadBytesRoute: 200 });

  const resp = await makeRequest({
    url: '/payload_size_check/test/route',
    method: 'POST',
    payload: { data: Array(150).fill('+').join('') },
  });

  expect(resp.statusCode).toBe(200);
  expect(resp.payload).toBe('+++++');
});

test('fails with 400 if payload size is larger than default and route config allows', async () => {
  await makeServer({ maxPayloadBytesDefault: 100, maxPayloadBytesRoute: 200 });

  const resp = await makeRequest({
    url: '/payload_size_check/test/route',
    method: 'POST',
    payload: { data: Array(250).fill('+').join('') },
  });

  expect(resp.statusCode).toBe(400);
  expect(resp.payload).toMatchSnapshot();
});
