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

import Hapi from 'hapi';
import { createMockServer } from './_mock_server';
import { createResolveImportErrorsRoute } from './resolve_import_errors';

describe('POST /api/saved_objects/_resolve_import_errors', () => {
  let server: Hapi.Server;
  const savedObjectsClient = {
    errors: {} as any,
    bulkCreate: jest.fn(),
    bulkGet: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(() => {
    server = createMockServer();
    jest.resetAllMocks();

    const prereqs = {
      getSavedObjectsClient: {
        assign: 'savedObjectsClient',
        method() {
          return savedObjectsClient;
        },
      },
    };

    server.route(
      createResolveImportErrorsRoute(prereqs, server, [
        'index-pattern',
        'visualization',
        'dashboard',
      ])
    );
  });

  test('formats successful response', async () => {
    const request = {
      method: 'POST',
      url: '/api/saved_objects/_resolve_import_errors',
      payload: [
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
      ].join('\r\n'),
      headers: {
        'content-Type': 'multipart/form-data; boundary=BOUNDARY',
      },
    };
    const { payload, statusCode } = await server.inject(request);
    const response = JSON.parse(payload);
    expect(statusCode).toBe(200);
    expect(response).toEqual({ success: true, successCount: 0 });
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(0);
  });

  test('defaults migrationVersion to empty object', async () => {
    const request = {
      method: 'POST',
      url: '/api/saved_objects/_resolve_import_errors',
      payload: [
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
      ].join('\r\n'),
      headers: {
        'content-Type': 'multipart/form-data; boundary=EXAMPLE',
      },
    };
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [
        {
          type: 'dashboard',
          id: 'my-dashboard',
          attributes: {
            title: 'Look at my dashboard',
          },
        },
      ],
    });
    const { payload, statusCode } = await server.inject(request);
    const response = JSON.parse(payload);
    expect(statusCode).toBe(200);
    expect(response).toEqual({ success: true, successCount: 1 });
    expect(savedObjectsClient.bulkCreate.mock.calls).toHaveLength(1);
    const firstBulkCreateCallArray = savedObjectsClient.bulkCreate.mock.calls[0][0];
    expect(firstBulkCreateCallArray).toHaveLength(1);
    expect(firstBulkCreateCallArray[0].migrationVersion).toEqual({});
  });

  test('retries importing a dashboard', async () => {
    // NOTE: changes to this scenario should be reflected in the docs
    const request = {
      method: 'POST',
      url: '/api/saved_objects/_resolve_import_errors',
      payload: [
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
      ].join('\r\n'),
      headers: {
        'content-Type': 'multipart/form-data; boundary=EXAMPLE',
      },
    };
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [
        {
          type: 'dashboard',
          id: 'my-dashboard',
          attributes: {
            title: 'Look at my dashboard',
          },
        },
      ],
    });
    const { payload, statusCode } = await server.inject(request);
    const response = JSON.parse(payload);
    expect(statusCode).toBe(200);
    expect(response).toEqual({ success: true, successCount: 1 });
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

  test('resolves conflicts for dashboard', async () => {
    // NOTE: changes to this scenario should be reflected in the docs
    const request = {
      method: 'POST',
      url: '/api/saved_objects/_resolve_import_errors',
      payload: [
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
      ].join('\r\n'),
      headers: {
        'content-Type': 'multipart/form-data; boundary=EXAMPLE',
      },
    };
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [
        {
          type: 'dashboard',
          id: 'my-dashboard',
          attributes: {
            title: 'Look at my dashboard',
          },
        },
      ],
    });
    const { payload, statusCode } = await server.inject(request);
    const response = JSON.parse(payload);
    expect(statusCode).toBe(200);
    expect(response).toEqual({ success: true, successCount: 1 });
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

  test('resolves conflicts by replacing the visualization references', async () => {
    // NOTE: changes to this scenario should be reflected in the docs
    const request = {
      method: 'POST',
      url: '/api/saved_objects/_resolve_import_errors',
      payload: [
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
      ].join('\r\n'),
      headers: {
        'content-Type': 'multipart/form-data; boundary=EXAMPLE',
      },
    };
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
    const { payload, statusCode } = await server.inject(request);
    const response = JSON.parse(payload);
    expect(statusCode).toBe(200);
    expect(response).toEqual({ success: true, successCount: 1 });
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
