/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObject, SavedObjectAttributes } from '../../../..';
import { savedObjectsClientMock } from '../../../../mocks';
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
