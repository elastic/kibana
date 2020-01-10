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

import * as kbnTestServer from '../../../../test_utils/kbn_server';

let root;
beforeAll(async () => {
  root = kbnTestServer.createRoot({ server: { maxPayloadBytes: 100 } });

  await root.setup();
  await root.start();

  kbnTestServer.getKbnServer(root).server.route({
    path: '/payload_size_check/test/route',
    method: 'POST',
    config: { payload: { maxBytes: 200 } },
    handler: req => req.payload.data.slice(0, 5),
  });
}, 30000);

afterAll(async () => await root.shutdown());

test('accepts payload with a size larger than default but smaller than route config allows', async () => {
  await kbnTestServer.request
    .post(root, '/payload_size_check/test/route')
    .send({
      data: Array(150)
        .fill('+')
        .join(''),
    })
    .expect(200, '+++++');
});

test('fails with 413 if payload size is larger than default and route config allows', async () => {
  await kbnTestServer.request
    .post(root, '/payload_size_check/test/route')
    .send({
      data: Array(250)
        .fill('+')
        .join(''),
    })
    .expect(413, {
      statusCode: 413,
      error: 'Request Entity Too Large',
      message: 'Payload content length greater than maximum allowed: 200',
    });
});
