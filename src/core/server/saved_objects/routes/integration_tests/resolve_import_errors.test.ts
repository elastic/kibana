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
import { registerResolveImportErrorsRoute } from '../resolve_import_errors';
import { savedObjectsClientMock } from '../../../../../core/server/mocks';
import { setupServer, createExportableType } from '../test_utils';
import { SavedObjectConfig } from '../../saved_objects_config';

type setupServerReturn = UnwrapPromise<ReturnType<typeof setupServer>>;

const allowedTypes = ['index-pattern', 'visualization', 'dashboard'];
const config = {
  maxImportPayloadBytes: 10485760,
  maxImportExportSize: 10000,
} as SavedObjectConfig;

describe('POST /api/saved_objects/_resolve_import_errors', () => {
  let server: setupServerReturn['server'];
  let httpSetup: setupServerReturn['httpSetup'];
  let handlerContext: setupServerReturn['handlerContext'];
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(async () => {
    ({ server, httpSetup, handlerContext } = await setupServer());
    handlerContext.savedObjects.typeRegistry.getImportableAndExportableTypes.mockReturnValue(
      allowedTypes.map(createExportableType)
    );

    savedObjectsClient = handlerContext.savedObjects.client;

    const router = httpSetup.createRouter('/api/saved_objects/');
    registerResolveImportErrorsRoute(router, config);

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('formats successful response', async () => {
    const result = await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_resolve_import_errors')
      .set('content-Type', 'multipart/form-data; boundary=BOUNDARY')
      .send(
        [
          '--BOUNDARY',
          'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
          'Content-Type: application/ndjson',
          '',
          '',
          '--BOUNDARY',
          'Content-Disposition: form-data; name="retries"',
          '',
          '[]',
          '--BOUNDARY--',
        ].join('\r\n')
      )
      .expect(200);

    expect(result.body).toEqual({ success: true, successCount: 0 });
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(0);
  });

  it('defaults migrationVersion to empty object', async () => {
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [
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
      .post('/api/saved_objects/_resolve_import_errors')
      .set('content-Type', 'multipart/form-data; boundary=EXAMPLE')
      .send(
        [
          '--EXAMPLE',
          'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
          'Content-Type: application/ndjson',
          '',
          '{"type":"dashboard","id":"my-dashboard","attributes":{"title":"Look at my dashboard"}}',
          '--EXAMPLE',
          'Content-Disposition: form-data; name="retries"',
          '',
          '[{"type":"dashboard","id":"my-dashboard"}]',
          '--EXAMPLE--',
        ].join('\r\n')
      )
      .expect(200);

    expect(result.body).toEqual({ success: true, successCount: 1 });
    expect(savedObjectsClient.bulkCreate.mock.calls).toHaveLength(1);
    const firstBulkCreateCallArray = savedObjectsClient.bulkCreate.mock.calls[0][0];
    expect(firstBulkCreateCallArray).toHaveLength(1);
    expect(firstBulkCreateCallArray[0].migrationVersion).toEqual({});
  });

  it('retries importing a dashboard', async () => {
    // NOTE: changes to this scenario should be reflected in the docs
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [
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
      .post('/api/saved_objects/_resolve_import_errors')
      .set('content-Type', 'multipart/form-data; boundary=EXAMPLE')
      .send(
        [
          '--EXAMPLE',
          'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
          'Content-Type: application/ndjson',
          '',
          '{"type":"dashboard","id":"my-dashboard","attributes":{"title":"Look at my dashboard"}}',
          '--EXAMPLE',
          'Content-Disposition: form-data; name="retries"',
          '',
          '[{"type":"dashboard","id":"my-dashboard"}]',
          '--EXAMPLE--',
        ].join('\r\n')
      )
      .expect(200);

    expect(result.body).toEqual({ success: true, successCount: 1 });
    expect(savedObjectsClient.bulkCreate).toMatchInlineSnapshot(`
      [MockFunction] {
        "calls": Array [
          Array [
            Array [
              Object {
                "attributes": Object {
                  "title": "Look at my dashboard",
                },
                "id": "my-dashboard",
                "migrationVersion": Object {},
                "type": "dashboard",
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

  it('resolves conflicts for dashboard', async () => {
    // NOTE: changes to this scenario should be reflected in the docs
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [
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
      .post('/api/saved_objects/_resolve_import_errors')
      .set('content-Type', 'multipart/form-data; boundary=EXAMPLE')
      .send(
        [
          '--EXAMPLE',
          'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
          'Content-Type: application/ndjson',
          '',
          '{"type":"index-pattern","id":"my-pattern","attributes":{"title":"my-pattern-*"}}',
          '{"type":"dashboard","id":"my-dashboard","attributes":{"title":"Look at my dashboard"}}',
          '--EXAMPLE',
          'Content-Disposition: form-data; name="retries"',
          '',
          '[{"type":"dashboard","id":"my-dashboard","overwrite":true}]',
          '--EXAMPLE--',
        ].join('\r\n')
      )
      .expect(200);

    expect(result.body).toEqual({ success: true, successCount: 1 });
    expect(savedObjectsClient.bulkCreate).toMatchInlineSnapshot(`
      [MockFunction] {
        "calls": Array [
          Array [
            Array [
              Object {
                "attributes": Object {
                  "title": "Look at my dashboard",
                },
                "id": "my-dashboard",
                "migrationVersion": Object {},
                "type": "dashboard",
              },
            ],
            Object {
              "namespace": undefined,
              "overwrite": true,
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

  it('resolves conflicts by replacing the visualization references', async () => {
    // NOTE: changes to this scenario should be reflected in the docs
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [
        {
          type: 'visualization',
          id: 'my-vis',
          attributes: {
            title: 'Look at my visualization',
          },
          references: [
            {
              name: 'ref_0',
              type: 'index-pattern',
              id: 'existing',
            },
          ],
        },
      ],
    });
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: 'existing',
          type: 'index-pattern',
          attributes: {},
          references: [],
        },
      ],
    });

    const result = await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_resolve_import_errors')
      .set('content-Type', 'multipart/form-data; boundary=EXAMPLE')
      .send(
        [
          '--EXAMPLE',
          'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
          'Content-Type: application/ndjson',
          '',
          '{"type":"visualization","id":"my-vis","attributes":{"title":"Look at my visualization"},"references":[{"name":"ref_0","type":"index-pattern","id":"missing"}]}',
          '--EXAMPLE',
          'Content-Disposition: form-data; name="retries"',
          '',
          '[{"type":"visualization","id":"my-vis","replaceReferences":[{"type":"index-pattern","from":"missing","to":"existing"}]}]',
          '--EXAMPLE--',
        ].join('\r\n')
      )
      .expect(200);

    expect(result.body).toEqual({ success: true, successCount: 1 });
    expect(savedObjectsClient.bulkCreate).toMatchInlineSnapshot(`
      [MockFunction] {
        "calls": Array [
          Array [
            Array [
              Object {
                "attributes": Object {
                  "title": "Look at my visualization",
                },
                "id": "my-vis",
                "migrationVersion": Object {},
                "references": Array [
                  Object {
                    "id": "existing",
                    "name": "ref_0",
                    "type": "index-pattern",
                  },
                ],
                "type": "visualization",
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
    expect(savedObjectsClient.bulkGet).toMatchInlineSnapshot(`
      [MockFunction] {
        "calls": Array [
          Array [
            Array [
              Object {
                "fields": Array [
                  "id",
                ],
                "id": "existing",
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
