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

import { SavedObject } from '../../../../../../server/saved_objects/service/saved_objects_client';
import { collectReferencesDeep } from './collect_references_deep';

const data = [
  {
    id: '1',
    type: 'dashboard',
    attributes: {
      panelsJSON: JSON.stringify([
        { type: 'visualization', id: '2' },
        { type: 'visualization', id: '3' },
      ]),
    },
  },
  {
    id: '2',
    type: 'visualization',
    attributes: {
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({ index: '4' }),
      },
    },
  },
  {
    id: '3',
    type: 'visualization',
    attributes: {
      savedSearchId: '5',
    },
  },
  {
    id: '4',
    type: 'index-pattern',
    attributes: {
      title: 'pattern*',
    },
  },
  {
    id: '5',
    type: 'search',
    attributes: {
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({ index: '4' }),
      },
    },
  },
];

test('collects dashboard and all dependencies', async () => {
  const savedObjectClient = {
    errors: {},
    create: jest.fn(),
    bulkCreate: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    findRelationships: jest.fn(),
    bulkGet: jest.fn(getObjects => {
      return {
        saved_objects: getObjects.map((obj: SavedObject) =>
          data.find(row => row.id === obj.id && row.type === obj.type)
        ),
      };
    }),
  };
  const objects = await collectReferencesDeep(savedObjectClient, [{ type: 'dashboard', id: '1' }]);
  expect(objects).toMatchInlineSnapshot(`
Array [
  Object {
    "attributes": Object {
      "panelsJSON": "[{\\"type\\":\\"visualization\\",\\"id\\":\\"2\\"},{\\"type\\":\\"visualization\\",\\"id\\":\\"3\\"}]",
    },
    "id": "1",
    "type": "dashboard",
  },
  Object {
    "attributes": Object {
      "kibanaSavedObjectMeta": Object {
        "searchSourceJSON": "{\\"index\\":\\"4\\"}",
      },
    },
    "id": "2",
    "type": "visualization",
  },
  Object {
    "attributes": Object {
      "savedSearchId": "5",
    },
    "id": "3",
    "type": "visualization",
  },
  Object {
    "attributes": Object {
      "title": "pattern*",
    },
    "id": "4",
    "type": "index-pattern",
  },
  Object {
    "attributes": Object {
      "kibanaSavedObjectMeta": Object {
        "searchSourceJSON": "{\\"index\\":\\"4\\"}",
      },
    },
    "id": "5",
    "type": "search",
  },
]
`);
});
