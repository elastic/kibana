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

import { SavedObject } from '../types';
import { extractErrors } from './extract_errors';

describe('extractErrors()', () => {
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

  test('returns empty array when no errors exist', async () => {
    const savedObjects: SavedObject[] = [];
    const result = await extractErrors(savedObjects, savedObjects, savedObjectsClient);
    expect(result).toMatchInlineSnapshot(`Array []`);
  });

  test('extracts errors from saved objects', async () => {
    const clientResponse = {
      saved_objects: [
        { id: '2', type: 'dashboard', attributes: { title: 'My Dashboard 2' } },
        { id: '3', type: 'dashboard', attributes: { title: 'My Dashboard 3' } },
      ],
    };
    savedObjectsClient.bulkGet.mockImplementation(() => Promise.resolve(clientResponse));

    const savedObjects: SavedObject[] = [
      {
        id: '1',
        type: 'dashboard',
        attributes: {
          title: 'My Dashboard 1',
        },
        references: [],
      },
      {
        id: '2',
        type: 'dashboard',
        attributes: {
          title: 'My Dashboard 2',
        },
        references: [],
        error: {
          statusCode: 409,
          message: 'Conflict',
        },
      },
      {
        id: '3',
        type: 'dashboard',
        attributes: {
          title: 'My Dashboard 3',
        },
        references: [],
        error: {
          statusCode: 400,
          message: 'Bad Request',
        },
      },
    ];
    const result = await extractErrors(savedObjects, savedObjects, savedObjectsClient);
    expect(result).toMatchInlineSnapshot(`
Array [
  Object {
    "error": Object {
      "type": "conflict",
    },
    "id": "2",
    "title": "My Dashboard 2",
    "type": "dashboard",
  },
  Object {
    "error": Object {
      "message": "Bad Request",
      "statusCode": 400,
      "type": "unknown",
    },
    "id": "3",
    "title": "My Dashboard 3",
    "type": "dashboard",
  },
]
`);
    savedObjectsClient.bulkGet.mockReset();
  });
});
