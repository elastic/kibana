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
import { createExportObjectsRoute } from './export_objects';

describe('POST /api/saved_objects/_import_objects', () => {
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
    server = MockServer();
    const prereqs = {
      getSavedObjectsClient: {
        assign: 'savedObjectsClient',
        method() {
          return savedObjectsClient;
        },
      },
    };

    server.route(createExportObjectsRoute(prereqs, server));
  });

  afterEach(() => {
    savedObjectsClient.bulkCreate.mockReset();
    savedObjectsClient.bulkGet.mockReset();
    savedObjectsClient.create.mockReset();
    savedObjectsClient.delete.mockReset();
    savedObjectsClient.find.mockReset();
    savedObjectsClient.get.mockReset();
    savedObjectsClient.update.mockReset();
  });

  test('formats successful response', async () => {
    const request = {
      method: 'POST',
      url: '/api/saved_objects/_export_objects',
      payload: {
        objects: [
          {
            type: 'index-pattern',
            id: '1',
          },
        ],
      },
    };
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
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
    "id": "1",
    "references": Array [],
    "type": "index-pattern",
  },
]
`);
    expect(savedObjectsClient.bulkGet).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Array [
        Object {
          "id": "1",
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
