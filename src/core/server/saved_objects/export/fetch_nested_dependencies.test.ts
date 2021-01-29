/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObject } from '../types';
import { savedObjectsClientMock } from '../../mocks';
import { getObjectReferencesToFetch, fetchNestedDependencies } from './fetch_nested_dependencies';
import { SavedObjectsErrorHelpers } from '..';

describe('getObjectReferencesToFetch()', () => {
  test('works with no saved objects', () => {
    const map = new Map<string, SavedObject>();
    const result = getObjectReferencesToFetch(map);
    expect(result).toEqual([]);
  });

  test('excludes already fetched objects', () => {
    const map = new Map<string, SavedObject>();
    map.set('index-pattern:1', {
      id: '1',
      type: 'index-pattern',
      attributes: {},
      references: [],
    });
    map.set('visualization:2', {
      id: '2',
      type: 'visualization',
      attributes: {},
      references: [
        {
          name: 'ref_0',
          type: 'index-pattern',
          id: '1',
        },
      ],
    });
    const result = getObjectReferencesToFetch(map);
    expect(result).toEqual([]);
  });

  test('returns objects that are missing', () => {
    const map = new Map<string, SavedObject>();
    map.set('visualization:2', {
      id: '2',
      type: 'visualization',
      attributes: {},
      references: [
        {
          name: 'ref_0',
          type: 'index-pattern',
          id: '1',
        },
      ],
    });
    const result = getObjectReferencesToFetch(map);
    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "1",
          "type": "index-pattern",
        },
      ]
    `);
  });

  test('does not fail on circular dependencies', () => {
    const map = new Map<string, SavedObject>();
    map.set('index-pattern:1', {
      id: '1',
      type: 'index-pattern',
      attributes: {},
      references: [
        {
          name: 'ref_0',
          type: 'visualization',
          id: '2',
        },
      ],
    });
    map.set('visualization:2', {
      id: '2',
      type: 'visualization',
      attributes: {},
      references: [
        {
          name: 'ref_0',
          type: 'index-pattern',
          id: '1',
        },
      ],
    });
    const result = getObjectReferencesToFetch(map);
    expect(result).toEqual([]);
  });
});

describe('injectNestedDependencies', () => {
  const savedObjectsClient = savedObjectsClientMock.create();

  afterEach(() => {
    jest.resetAllMocks();
  });

  test(`doesn't fetch when no dependencies are missing`, async () => {
    const savedObjects = [
      {
        id: '1',
        type: 'index-pattern',
        attributes: {},
        references: [],
      },
    ];
    const result = await fetchNestedDependencies(savedObjects, savedObjectsClient);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "missingRefs": Array [],
        "objects": Array [
          Object {
            "attributes": Object {},
            "id": "1",
            "references": Array [],
            "type": "index-pattern",
          },
        ],
      }
    `);
  });

  test(`doesn't fetch references that are already fetched`, async () => {
    const savedObjects = [
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
    ];
    const result = await fetchNestedDependencies(savedObjects, savedObjectsClient);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "missingRefs": Array [],
        "objects": Array [
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
        ],
      }
    `);
  });

  test('fetches dependencies at least one level deep', async () => {
    const savedObjects = [
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
    ];
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'index-pattern',
          attributes: {},
          references: [],
        },
      ],
    });
    const result = await fetchNestedDependencies(savedObjects, savedObjectsClient);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "missingRefs": Array [],
        "objects": Array [
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
          Object {
            "attributes": Object {},
            "id": "1",
            "references": Array [],
            "type": "index-pattern",
          },
        ],
      }
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
            Object {
              "namespace": undefined,
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

  test('fetches dependencies multiple levels deep', async () => {
    const savedObjects = [
      {
        id: '5',
        type: 'dashboard',
        attributes: {},
        references: [
          {
            name: 'panel_0',
            type: 'visualization',
            id: '4',
          },
          {
            name: 'panel_1',
            type: 'visualization',
            id: '3',
          },
        ],
      },
    ];
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '4',
          type: 'visualization',
          attributes: {},
          references: [
            {
              name: 'ref_0',
              type: 'search',
              id: '2',
            },
          ],
        },
        {
          id: '3',
          type: 'visualization',
          attributes: {},
          references: [
            {
              name: 'ref_0',
              type: 'index-pattern',
              id: '1',
            },
          ],
        },
      ],
    });
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
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
        {
          id: '1',
          type: 'index-pattern',
          attributes: {},
          references: [],
        },
      ],
    });
    const result = await fetchNestedDependencies(savedObjects, savedObjectsClient);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "missingRefs": Array [],
        "objects": Array [
          Object {
            "attributes": Object {},
            "id": "5",
            "references": Array [
              Object {
                "id": "4",
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
            "attributes": Object {},
            "id": "4",
            "references": Array [
              Object {
                "id": "2",
                "name": "ref_0",
                "type": "search",
              },
            ],
            "type": "visualization",
          },
          Object {
            "attributes": Object {},
            "id": "3",
            "references": Array [
              Object {
                "id": "1",
                "name": "ref_0",
                "type": "index-pattern",
              },
            ],
            "type": "visualization",
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
          Object {
            "attributes": Object {},
            "id": "1",
            "references": Array [],
            "type": "index-pattern",
          },
        ],
      }
    `);
    expect(savedObjectsClient.bulkGet).toMatchInlineSnapshot(`
      [MockFunction] {
        "calls": Array [
          Array [
            Array [
              Object {
                "id": "4",
                "type": "visualization",
              },
              Object {
                "id": "3",
                "type": "visualization",
              },
            ],
            Object {
              "namespace": undefined,
            },
          ],
          Array [
            Array [
              Object {
                "id": "2",
                "type": "search",
              },
              Object {
                "id": "1",
                "type": "index-pattern",
              },
            ],
            Object {
              "namespace": undefined,
            },
          ],
        ],
        "results": Array [
          Object {
            "type": "return",
            "value": Promise {},
          },
          Object {
            "type": "return",
            "value": Promise {},
          },
        ],
      }
    `);
  });

  test('returns list of missing references', async () => {
    const savedObjects = [
      {
        id: '1',
        type: 'search',
        attributes: {},
        references: [
          {
            name: 'ref_0',
            type: 'index-pattern',
            id: '1',
          },
          {
            name: 'ref_1',
            type: 'index-pattern',
            id: '2',
          },
        ],
      },
    ];
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'index-pattern',
          error: SavedObjectsErrorHelpers.createGenericNotFoundError('index-pattern', '1').output
            .payload,
          attributes: {},
          references: [],
        },
        {
          id: '2',
          type: 'index-pattern',
          attributes: {},
          references: [],
        },
      ],
    });
    const result = await fetchNestedDependencies(savedObjects, savedObjectsClient);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "missingRefs": Array [
          Object {
            "id": "1",
            "type": "index-pattern",
          },
        ],
        "objects": Array [
          Object {
            "attributes": Object {},
            "id": "1",
            "references": Array [
              Object {
                "id": "1",
                "name": "ref_0",
                "type": "index-pattern",
              },
              Object {
                "id": "2",
                "name": "ref_1",
                "type": "index-pattern",
              },
            ],
            "type": "search",
          },
          Object {
            "attributes": Object {},
            "id": "2",
            "references": Array [],
            "type": "index-pattern",
          },
        ],
      }
    `);
  });

  test('does not fail on circular dependencies', async () => {
    const savedObjects = [
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
    ];
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'index-pattern',
          attributes: {},
          references: [
            {
              name: 'ref_0',
              type: 'search',
              id: '2',
            },
          ],
        },
      ],
    });
    const result = await fetchNestedDependencies(savedObjects, savedObjectsClient);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "missingRefs": Array [],
        "objects": Array [
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
          Object {
            "attributes": Object {},
            "id": "1",
            "references": Array [
              Object {
                "id": "2",
                "name": "ref_0",
                "type": "search",
              },
            ],
            "type": "index-pattern",
          },
        ],
      }
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
            Object {
              "namespace": undefined,
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
