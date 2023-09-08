/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { setupIntegrationEnvironment, TestEnvironmentUtils } from '../../test_utils';

describe('Files usage telemetry', () => {
  let testHarness: TestEnvironmentUtils;
  let createFile: TestEnvironmentUtils['createFile'];
  let root: TestEnvironmentUtils['root'];
  let request: TestEnvironmentUtils['request'];
  let fileKind: TestEnvironmentUtils['fileKind'];

  beforeAll(async () => {
    testHarness = await setupIntegrationEnvironment();
    ({ createFile, root, request, fileKind } = testHarness);
  });

  beforeEach(async () => {
    await testHarness.cleanupAfterEach();
  });

  afterAll(async () => {
    await testHarness.cleanupAfterAll();
  });

  it('creates an object with the expected values', async () => {
    const file1 = await createFile();
    const file2 = await createFile();
    const file3 = await createFile();

    await request
      .put(root, `/api/files/files/${fileKind}/${file1.id}/blob`)
      .set('Content-Type', 'application/octet-stream')
      .send('what have you')
      .expect(200);

    await Promise.all([
      request.post(root, `/api/files/shares/${fileKind}/${file2.id}`).send({}).expect(200),
      request.post(root, `/api/files/shares/${fileKind}/${file3.id}`).send({}).expect(200),
    ]);

    const { body } = await request
      .post(root, '/internal/telemetry/clusters/_stats')
      .set(ELASTIC_HTTP_VERSION_HEADER, '2')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send({ unencrypted: true });

    expect(body[0].stats.stack_stats.kibana.plugins.files).toMatchInlineSnapshot(`
      Object {
        "countByExtension": Array [
          Object {
            "count": 3,
            "extension": "png",
          },
        ],
        "countByStatus": Object {
          "AWAITING_UPLOAD": 2,
          "READY": 1,
        },
        "storage": Object {
          "esFixedSizeIndex": Object {
            "available": 53687091187,
            "capacity": 53687091200,
            "used": 13,
          },
        },
      }
    `);
  });
});
