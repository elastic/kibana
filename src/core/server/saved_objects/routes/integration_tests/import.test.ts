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

import supertest from 'supertest';
import { UnwrapPromise } from '@kbn/utility-types';
import { registerImportRoute } from '../import';
import { savedObjectsClientMock } from '../../../../../core/server/mocks';
import { SavedObjectConfig } from '../../saved_objects_config';
import { setupServer } from './test_utils';

type setupServerReturn = UnwrapPromise<ReturnType<typeof setupServer>>;

const allowedTypes = ['index-pattern', 'visualization', 'dashboard'];
const config = {
  maxImportPayloadBytes: 10485760,
  maxImportExportSize: 10000,
} as SavedObjectConfig;

describe('POST /api/saved_objects/_import', () => {
  let server: setupServerReturn['server'];
  let httpSetup: setupServerReturn['httpSetup'];
  let handlerContext: setupServerReturn['handlerContext'];
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

  const emptyResponse = {
    saved_objects: [],
    total: 0,
    per_page: 0,
    page: 0,
  };

  beforeEach(async () => {
    ({ server, httpSetup, handlerContext } = await setupServer());
    savedObjectsClient = handlerContext.savedObjects.client;

    savedObjectsClient.find.mockResolvedValue(emptyResponse);

    const router = httpSetup.createRouter('/api/saved_objects/');
    registerImportRoute(router, config, allowedTypes);

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('formats successful response', async () => {
    const result = await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_import')
      .set('content-Type', 'multipart/form-data; boundary=BOUNDARY')
      .send(
        [
          '--BOUNDARY',
          'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
          'Content-Type: application/ndjson',
          '',
          '',
          '--BOUNDARY--',
        ].join('\r\n')
      )
      .expect(200);

    expect(result.body).toEqual({
      success: true,
      successCount: 0,
    });
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(0);
  });

  it('defaults migrationVersion to empty object', async () => {
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [
        {
          type: 'index-pattern',
          id: 'my-pattern',
          attributes: {
            title: 'my-pattern-*',
          },
          references: [],
        },
      ],
    });

    const result = await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_import')
      .set('content-Type', 'multipart/form-data; boundary=EXAMPLE')
      .send(
        [
          '--EXAMPLE',
          'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
          'Content-Type: application/ndjson',
          '',
          '{"type":"index-pattern","id":"my-pattern","attributes":{"title":"my-pattern-*"}}',
          '--EXAMPLE--',
        ].join('\r\n')
      )
      .expect(200);

    expect(result.body).toEqual({
      success: true,
      successCount: 1,
    });
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
    const firstBulkCreateCallArray = savedObjectsClient.bulkCreate.mock.calls[0][0];
    expect(firstBulkCreateCallArray).toHaveLength(1);
    expect(firstBulkCreateCallArray[0].migrationVersion).toEqual({});
  });

  it('imports an index pattern and dashboard, ignoring empty lines in the file', async () => {
    // NOTE: changes to this scenario should be reflected in the docs

    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [
        {
          type: 'index-pattern',
          id: 'my-pattern',
          attributes: {
            title: 'my-pattern-*',
          },
          references: [],
        },
        {
          type: 'dashboard',
          id: 'my-dashboard',
          attributes: {
            title: 'Look at my dashboard',
          },
          references: [],
        },
      ],
    });

    const result = await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_import')
      .set('content-Type', 'multipart/form-data; boundary=EXAMPLE')
      .send(
        [
          '--EXAMPLE',
          'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
          'Content-Type: application/ndjson',
          '',
          '{"type":"index-pattern","id":"my-pattern","attributes":{"title":"my-pattern-*"}}',
          '',
          '',
          '',
          '{"type":"dashboard","id":"my-dashboard","attributes":{"title":"Look at my dashboard"}}',
          '--EXAMPLE--',
        ].join('\r\n')
      )
      .expect(200);

    expect(result.body).toEqual({
      success: true,
      successCount: 2,
    });
  });

  it('imports an index pattern and dashboard but has a conflict on the index pattern', async () => {
    // NOTE: changes to this scenario should be reflected in the docs

    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [
        {
          type: 'index-pattern',
          id: 'my-pattern',
          attributes: {},
          references: [],
          error: {
            statusCode: 409,
            message: 'version conflict, document already exists',
          },
        },
        {
          type: 'dashboard',
          id: 'my-dashboard',
          attributes: {
            title: 'Look at my dashboard',
          },
          references: [],
        },
      ],
    });

    const result = await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_import')
      .set('content-Type', 'multipart/form-data; boundary=EXAMPLE')
      .send(
        [
          '--EXAMPLE',
          'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
          'Content-Type: application/ndjson',
          '',
          '{"type":"index-pattern","id":"my-pattern","attributes":{"title":"my-pattern-*"}}',
          '{"type":"dashboard","id":"my-dashboard","attributes":{"title":"Look at my dashboard"}}',
          '--EXAMPLE--',
        ].join('\r\n')
      )
      .expect(200);

    expect(result.body).toEqual({
      success: false,
      successCount: 1,
      errors: [
        {
          id: 'my-pattern',
          type: 'index-pattern',
          title: 'my-pattern-*',
          error: {
            type: 'conflict',
          },
        },
      ],
    });
  });

  it('imports a visualization with missing references', async () => {
    // NOTE: changes to this scenario should be reflected in the docs

    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: 'my-pattern-*',
          type: 'index-pattern',
          error: {
            statusCode: 404,
            message: 'Not found',
          },
          references: [],
          attributes: {},
        },
      ],
    });

    const result = await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_import')
      .set('content-Type', 'multipart/form-data; boundary=EXAMPLE')
      .send(
        [
          '--EXAMPLE',
          'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
          'Content-Type: application/ndjson',
          '',
          '{"type":"visualization","id":"my-vis","attributes":{"title":"my-vis"},"references":[{"name":"ref_0","type":"index-pattern","id":"my-pattern-*"}]}',
          '{"type":"dashboard","id":"my-dashboard","attributes":{"title":"Look at my dashboard"},"references":[{"name":"ref_0","type":"visualization","id":"my-vis"}]}',
          '--EXAMPLE--',
        ].join('\r\n')
      )
      .expect(200);

    expect(result.body).toEqual({
      success: false,
      successCount: 0,
      errors: [
        {
          id: 'my-vis',
          type: 'visualization',
          title: 'my-vis',
          error: {
            type: 'missing_references',
            references: [
              {
                type: 'index-pattern',
                id: 'my-pattern-*',
              },
            ],
            blocking: [
              {
                type: 'dashboard',
                id: 'my-dashboard',
              },
            ],
          },
        },
      ],
    });
    expect(savedObjectsClient.bulkGet).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Array [
        Object {
          "fields": Array [
            "id",
          ],
          "id": "my-pattern-*",
          "type": "index-pattern",
        },
      ],
      Object {
        "namespace": undefined,
      },
    ],
  ],
  "results": Array [
    Object {
      "type": "return",
      "value": Promise {},
    },
  ],
}
`);
  });
});
