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

import { SavedObject, SavedObjectAttributes } from 'src/core/server';
import { savedObjectsClientMock } from '../../../../../core/server/mocks';
import { collectReferencesDeep } from './collect_references_deep';

const data: Array<SavedObject<SavedObjectAttributes>> = [
  {
    id: '1',
    type: 'dashboard',
    attributes: {
      panelsJSON: JSON.stringify([{ panelRefName: 'panel_0' }, { panelRefName: 'panel_1' }]),
    },
    references: [
      {
        name: 'panel_0',
        type: 'visualization',
        id: '2',
      },
      {
        name: 'panel_1',
        type: 'visualization',
        id: '3',
      },
    ],
  },
  {
    id: '2',
    type: 'visualization',
    attributes: {
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({
          indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        }),
      },
    },
    references: [
      {
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
        id: '4',
      },
    ],
  },
  {
    id: '3',
    type: 'visualization',
    attributes: {
      savedSearchRefName: 'search_0',
    },
    references: [
      {
        name: 'search_0',
        type: 'search',
        id: '5',
      },
    ],
  },
  {
    id: '4',
    type: 'index-pattern',
    attributes: {
      title: 'pattern*',
    },
    references: [],
  },
  {
    id: '5',
    type: 'search',
    attributes: {
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({
          indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        }),
      },
    },
    references: [
      {
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
        id: '4',
      },
    ],
  },
];

test('collects dashboard and all dependencies', async () => {
  const savedObjectClient = savedObjectsClientMock.create();
  savedObjectClient.bulkGet.mockImplementation((objects) => {
    if (!objects) {
      throw new Error('Invalid test data');
    }
    return Promise.resolve({
      saved_objects: objects.map(
        (obj: any) => data.find((row) => row.id === obj.id && row.type === obj.type)!
      ),
    });
  });
  const objects = await collectReferencesDeep(savedObjectClient, [{ type: 'dashboard', id: '1' }]);
  expect(objects).toMatchInlineSnapshot(`
    Array [
      Object {
        "attributes": Object {
          "panelsJSON": "[{\\"panelRefName\\":\\"panel_0\\"},{\\"panelRefName\\":\\"panel_1\\"}]",
        },
        "id": "1",
        "references": Array [
          Object {
            "id": "2",
            "name": "panel_0",
            "type": "visualization",
          },
          Object {
            "id": "3",
            "name": "panel_1",
            "type": "visualization",
          },
        ],
        "type": "dashboard",
      },
      Object {
        "attributes": Object {
          "kibanaSavedObjectMeta": Object {
            "searchSourceJSON": "{\\"indexRefName\\":\\"kibanaSavedObjectMeta.searchSourceJSON.index\\"}",
          },
        },
        "id": "2",
        "references": Array [
          Object {
            "id": "4",
            "name": "kibanaSavedObjectMeta.searchSourceJSON.index",
            "type": "index-pattern",
          },
        ],
        "type": "visualization",
      },
      Object {
        "attributes": Object {
          "savedSearchRefName": "search_0",
        },
        "id": "3",
        "references": Array [
          Object {
            "id": "5",
            "name": "search_0",
            "type": "search",
          },
        ],
        "type": "visualization",
      },
      Object {
        "attributes": Object {
          "title": "pattern*",
        },
        "id": "4",
        "references": Array [],
        "type": "index-pattern",
      },
      Object {
        "attributes": Object {
          "kibanaSavedObjectMeta": Object {
            "searchSourceJSON": "{\\"indexRefName\\":\\"kibanaSavedObjectMeta.searchSourceJSON.index\\"}",
          },
        },
        "id": "5",
        "references": Array [
          Object {
            "id": "4",
            "name": "kibanaSavedObjectMeta.searchSourceJSON.index",
            "type": "index-pattern",
          },
        ],
        "type": "search",
      },
    ]
  `);
});
