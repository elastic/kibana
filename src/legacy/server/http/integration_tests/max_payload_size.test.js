/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import * as kbnTestServer from '../../../../core/test_helpers/kbn_server';

let root;
beforeAll(async () => {
  root = kbnTestServer.createRoot({
    server: { maxPayloadBytes: 100 },
    migrations: { skip: true },
    plugins: { initialize: false },
  });

  await root.setup();
  await root.start();

  kbnTestServer.getKbnServer(root).server.route({
    path: '/payload_size_check/test/route',
    method: 'POST',
    config: { payload: { maxBytes: 200 } },
    handler: (req) => req.payload.data.slice(0, 5),
  });
}, 30000);

afterAll(async () => await root.shutdown());

test('accepts payload with a size larger than default but smaller than route config allows', async () => {
  await kbnTestServer.request
    .post(root, '/payload_size_check/test/route')
    .send({
      data: Array(150).fill('+').join(''),
    })
    .expect(200, '+++++');
});

test('fails with 413 if payload size is larger than default and route config allows', async () => {
  await kbnTestServer.request
    .post(root, '/payload_size_check/test/route')
    .send({
      data: Array(250).fill('+').join(''),
    })
    .expect(413, {
      statusCode: 413,
      error: 'Request Entity Too Large',
      message: 'Payload content length greater than maximum allowed: 200',
    });
});
