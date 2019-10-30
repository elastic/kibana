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

jest.mock('../../../../core/server/saved_objects/export', () => ({
  getSortedObjectsForExport: jest.fn(),
}));

import Hapi from 'hapi';
// Disable lint errors for imports from src/core/server/saved_objects until SavedObjects migration is complete
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import * as exportMock from '../../../../core/server/saved_objects/export';
import { createMockServer } from './_mock_server';
import { createExportRoute } from './export';
import { createListStream } from '../../../utils/streams';
import { savedObjectsClientMock } from '../../../../core/server/mocks';

const getSortedObjectsForExport = exportMock.getSortedObjectsForExport as jest.Mock;

describe('POST /api/saved_objects/_export', () => {
  let server: Hapi.Server;
  const savedObjectsClient = {
    ...savedObjectsClientMock.create(),
    errors: {} as any,
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

  test('does not allow both "search" and "objects" to be specified', async () => {
    const request = {
      method: 'POST',
      url: '/api/saved_objects/_export',
      payload: {
        search: 'search',
        objects: [{ type: 'search', id: 'bar' }],
        includeReferencesDeep: true,
      },
    };

    const { payload, statusCode } = await server.inject(request);

    expect(statusCode).toEqual(400);
    expect(JSON.parse(payload)).toMatchInlineSnapshot(`
      Object {
        "error": "Bad Request",
        "message": "\\"search\\" must not exist simultaneously with [objects]",
        "statusCode": 400,
        "validation": Object {
          "keys": Array [
            "value",
          ],
          "source": "payload",
        },
      }
    `);
  });

  test('formats successful response', async () => {
    const request = {
      method: 'POST',
      url: '/api/saved_objects/_export',
      payload: {
        type: 'search',
        search: 'my search string',
        includeReferencesDeep: true,
      },
    };
    getSortedObjectsForExport.mockResolvedValueOnce(
      createListStream([
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
      ])
    );

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
              "excludeExportDetails": false,
              "exportSizeLimit": 10000,
              "includeReferencesDeep": true,
              "objects": undefined,
              "savedObjectsClient": Object {
                "bulkCreate": [MockFunction],
                "bulkGet": [MockFunction],
                "bulkUpdate": [MockFunction],
                "create": [MockFunction],
                "delete": [MockFunction],
                "errors": Object {},
                "find": [MockFunction],
                "get": [MockFunction],
                "update": [MockFunction],
              },
              "search": "my search string",
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
