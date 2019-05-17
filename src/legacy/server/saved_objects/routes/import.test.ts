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
import { createImportRoute } from './import';

describe('POST /api/saved_objects/_import', () => {
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
      createImportRoute(prereqs, server, ['index-pattern', 'visualization', 'dashboard'])
    );
  });

  test('formats successful response', async () => {
    const request = {
      method: 'POST',
      url: '/api/saved_objects/_import',
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
    savedObjectsClient.find.mockResolvedValueOnce({ saved_objects: [] });
    const { payload, statusCode } = await server.inject(request);
    const response = JSON.parse(payload);
    expect(statusCode).toBe(200);
    expect(response).toEqual({
      success: true,
      successCount: 0,
    });
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(0);
  });

  test('defaults migrationVersion to empty object', async () => {
    const request = {
      method: 'POST',
      url: '/api/saved_objects/_import',
      payload: [
        '--EXAMPLE',
        'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
        'Content-Type: application/ndjson',
        '',
        '{"type":"index-pattern","id":"my-pattern","attributes":{"title":"my-pattern-*"}}',
        '--EXAMPLE--',
      ].join('\r\n'),
      headers: {
        'content-Type': 'multipart/form-data; boundary=EXAMPLE',
      },
    };
    savedObjectsClient.find.mockResolvedValueOnce({ saved_objects: [] });
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [
        {
          type: 'index-pattern',
          id: 'my-pattern',
          attributes: {
            title: 'my-pattern-*',
          },
        },
      ],
    });
    const { payload, statusCode } = await server.inject(request);
    const response = JSON.parse(payload);
    expect(statusCode).toBe(200);
    expect(response).toEqual({
      success: true,
      successCount: 1,
    });
    expect(savedObjectsClient.bulkCreate.mock.calls).toHaveLength(1);
    const firstBulkCreateCallArray = savedObjectsClient.bulkCreate.mock.calls[0][0];
    expect(firstBulkCreateCallArray).toHaveLength(1);
    expect(firstBulkCreateCallArray[0].migrationVersion).toEqual({});
  });

  test('imports an index pattern and dashboard', async () => {
    // NOTE: changes to this scenario should be reflected in the docs
    const request = {
      method: 'POST',
      url: '/api/saved_objects/_import',
      payload: [
        '--EXAMPLE',
        'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
        'Content-Type: application/ndjson',
        '',
        '{"type":"index-pattern","id":"my-pattern","attributes":{"title":"my-pattern-*"}}',
        '{"type":"dashboard","id":"my-dashboard","attributes":{"title":"Look at my dashboard"}}',
        '--EXAMPLE--',
      ].join('\r\n'),
      headers: {
        'content-Type': 'multipart/form-data; boundary=EXAMPLE',
      },
    };
    savedObjectsClient.find.mockResolvedValueOnce({ saved_objects: [] });
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [
        {
          type: 'index-pattern',
          id: 'my-pattern',
          attributes: {
            title: 'my-pattern-*',
          },
        },
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
    expect(response).toEqual({
      success: true,
      successCount: 2,
    });
  });

  test('imports an index pattern and dashboard but has a conflict on the index pattern', async () => {
    // NOTE: changes to this scenario should be reflected in the docs
    const request = {
      method: 'POST',
      url: '/api/saved_objects/_import',
      payload: [
        '--EXAMPLE',
        'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
        'Content-Type: application/ndjson',
        '',
        '{"type":"index-pattern","id":"my-pattern","attributes":{"title":"my-pattern-*"}}',
        '{"type":"dashboard","id":"my-dashboard","attributes":{"title":"Look at my dashboard"}}',
        '--EXAMPLE--',
      ].join('\r\n'),
      headers: {
        'content-Type': 'multipart/form-data; boundary=EXAMPLE',
      },
    };
    savedObjectsClient.find.mockResolvedValueOnce({ saved_objects: [] });
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
    const { payload, statusCode } = await server.inject(request);
    const response = JSON.parse(payload);
    expect(statusCode).toBe(200);
    expect(response).toEqual({
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

  test('imports a visualization with missing references', async () => {
    // NOTE: changes to this scenario should be reflected in the docs
    const request = {
      method: 'POST',
      url: '/api/saved_objects/_import',
      payload: [
        '--EXAMPLE',
        'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
        'Content-Type: application/ndjson',
        '',
        '{"type":"visualization","id":"my-vis","attributes":{"title":"my-vis"},"references":[{"name":"ref_0","type":"index-pattern","id":"my-pattern-*"}]}',
        '{"type":"dashboard","id":"my-dashboard","attributes":{"title":"Look at my dashboard"},"references":[{"name":"ref_0","type":"visualization","id":"my-vis"}]}',
        '--EXAMPLE--',
      ].join('\r\n'),
      headers: {
        'content-Type': 'multipart/form-data; boundary=EXAMPLE',
      },
    };
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: 'my-pattern-*',
          type: 'index-pattern',
          error: {
            statusCode: 404,
            message: 'Not found',
          },
        },
      ],
    });
    const { payload, statusCode } = await server.inject(request);
    const response = JSON.parse(payload);
    expect(statusCode).toBe(200);
    expect(response).toEqual({
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
