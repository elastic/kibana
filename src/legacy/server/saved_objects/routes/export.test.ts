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
import { MockServer } from './_mock_server';
import { createExportRoute } from './export';

describe('GET /api/saved_objects/_export', () => {
  let server: Hapi.Server;
  const savedObjectsClient = {
    find: jest.fn(),
    bulkGet: jest.fn(),
  };

  beforeEach(() => {
    server = MockServer();
    const prereqs = {
      getSavedObjectsClient: {
        assign: 'savedObjectsClient',
        method() {
          return savedObjectsClient;
        },
      },
    };

    server.route(createExportRoute(prereqs));
  });

  afterEach(() => {
    savedObjectsClient.find.mockClear();
    savedObjectsClient.bulkGet.mockClear();
  });

  test('formats successful response', async () => {
    const request = {
      method: 'GET',
      url: '/api/saved_objects/_export',
    };
    savedObjectsClient.find.mockResolvedValueOnce({
      total: 2,
      saved_objects: [
        {
          id: '1',
          type: 'search',
          references: [
            {
              type: 'index-pattern',
              id: '2',
            },
          ],
        },
        {
          id: '2',
          type: 'index-pattern',
          references: [],
        },
      ],
    });

    const { payload, statusCode } = await server.inject(request);
    const objects = payload.split('\n').map(row => JSON.parse(row));

    expect(statusCode).toBe(200);
    expect(objects).toMatchInlineSnapshot(`
Array [
  Object {
    "id": "2",
    "references": Array [],
    "type": "index-pattern",
  },
  Object {
    "id": "1",
    "references": Array [
      Object {
        "id": "2",
        "type": "index-pattern",
      },
    ],
    "type": "search",
  },
]
`);
    expect(savedObjectsClient.find).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Object {
        "perPage": 10000,
        "type": Array [
          "index-pattern",
          "search",
          "visualization",
          "dashboard",
        ],
      },
    ],
  ],
  "results": Array [
    Object {
      "isThrow": false,
      "value": Promise {},
    },
  ],
}
`);
  });
});
