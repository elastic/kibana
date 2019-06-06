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

jest.mock('../export', () => ({
  getSortedObjectsForExport: jest.fn(),
}));

import Hapi from 'hapi';
import * as exportMock from '../export';
import { createMockServer } from './_mock_server';
import { createExportRoute } from './export';

const getSortedObjectsForExport = exportMock.getSortedObjectsForExport as jest.Mock;

describe('POST /api/saved_objects/_export', () => {
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
    const prereqs = {
      getSavedObjectsClient: {
        assign: 'savedObjectsClient',
        method() {
          return savedObjectsClient;
        },
      },
    };

    server.route(createExportRoute(prereqs, server, ['index-pattern', 'search']));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('formats successful response', async () => {
    const request = {
      method: 'POST',
      url: '/api/saved_objects/_export',
      payload: {
        type: 'search',
        includeReferencesDeep: true,
      },
    };
    getSortedObjectsForExport.mockResolvedValueOnce([
      {
        id: '1',
        type: 'index-pattern',
        attributes: {},
        references: [],
      },
      {
        id: '2',
        type: 'search',
        attributes: {},
        references: [
          {
            name: 'ref_0',
            type: 'index-pattern',
            id: '1',
          },
        ],
      },
    ]);

    const { payload, statusCode, headers } = await server.inject(request);
    const objects = payload.split('\n').map(row => JSON.parse(row));

    expect(statusCode).toBe(200);
    expect(headers).toHaveProperty('content-disposition', 'attachment; filename="export.ndjson"');
    expect(headers).toHaveProperty('content-type', 'application/ndjson');
    expect(objects).toMatchInlineSnapshot(`
Array [
  Object {
    "attributes": Object {},
    "id": "1",
    "references": Array [],
    "type": "index-pattern",
  },
  Object {
    "attributes": Object {},
    "id": "2",
    "references": Array [
      Object {
        "id": "1",
        "name": "ref_0",
        "type": "index-pattern",
      },
    ],
    "type": "search",
  },
]
`);
    expect(getSortedObjectsForExport).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Object {
        "exportSizeLimit": 10000,
        "includeReferencesDeep": true,
        "objects": undefined,
        "savedObjectsClient": Object {
          "bulkCreate": [MockFunction],
          "bulkGet": [MockFunction],
          "create": [MockFunction],
          "delete": [MockFunction],
          "errors": Object {},
          "find": [MockFunction],
          "get": [MockFunction],
          "update": [MockFunction],
        },
        "types": Array [
          "search",
        ],
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
