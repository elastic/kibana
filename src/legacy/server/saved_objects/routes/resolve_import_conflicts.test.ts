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
import { createResolveImportConflictsRoute } from './resolve_import_conflicts';

describe('POST /api/saved_objects/_resolve_import_conflicts', () => {
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
    savedObjectsClient.bulkCreate.mockReset();
    savedObjectsClient.bulkGet.mockReset();
    savedObjectsClient.create.mockReset();
    savedObjectsClient.delete.mockReset();
    savedObjectsClient.find.mockReset();
    savedObjectsClient.get.mockReset();
    savedObjectsClient.update.mockReset();

    const prereqs = {
      getSavedObjectsClient: {
        assign: 'savedObjectsClient',
        method() {
          return savedObjectsClient;
        },
      },
    };

    server.route(createResolveImportConflictsRoute(prereqs, server));
  });

  test('formats successful response', async () => {
    const request = {
      method: 'POST',
      url: '/api/saved_objects/_resolve_import_conflicts',
      payload: [
        '--BOUNDARY',
        'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
        'Content-Type: application/ndjson',
        '',
        '',
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

  test('resolves conflicts for an index pattern and dashboard but skips the index pattern', async () => {
    // NOTE: changes to this scenario should be reflected in the docs
    const request = {
      method: 'POST',
      url: '/api/saved_objects/_resolve_import_conflicts',
      payload: [
        '--EXAMPLE',
        'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
        'Content-Type: application/ndjson',
        '',
        '{"type":"index-pattern","id":"my-pattern","attributes":{"title":"my-pattern-*"}}',
        '{"type":"dashboard","id":"my-dashboard","attributes":{"title":"Look at my dashboard"}}',
        '--EXAMPLE',
        'Content-Disposition: form-data; name="skips"',
        '',
        '[{"type":"index-pattern","id":"my-pattern"}]',
        '--EXAMPLE',
        'Content-Disposition: form-data; name="overwrites"',
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
      url: '/api/saved_objects/_resolve_import_conflicts',
      payload: [
        '--EXAMPLE',
        'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
        'Content-Type: application/ndjson',
        '',
        '{"type":"visualization","id":"my-vis","attributes":{"title":"Look at my visualization"}}',
        '{"type":"dashboard","id":"my-dashboard","attributes":{"title":"Look at my dashboard"},"references":[{"name":"panel_0","type":"visualization","id":"my-vis"}]}',
        '--EXAMPLE',
        'Content-Disposition: form-data; name="replaceReferences"',
        '',
        '[{"type":"visualization","from":"my-vis","to":"my-vis-2"}]',
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
          references: [
            {
              name: 'panel_0',
              type: 'visualization',
              id: 'my-vis-2',
            },
          ],
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
          "references": Array [
            Object {
              "id": "my-vis-2",
              "name": "panel_0",
              "type": "visualization",
            },
          ],
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
});
