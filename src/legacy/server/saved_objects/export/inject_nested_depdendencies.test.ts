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

import { SavedObject } from '../service/saved_objects_client';
import {
  getObjectReferencesToFetch,
  injectNestedDependencies,
} from './inject_nested_depdendencies';

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

  test(`doesn't deal with circular dependencies`, () => {
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
  const savedObjectsClient = {
    errors: {} as any,
    find: jest.fn(),
    bulkGet: jest.fn(),
    create: jest.fn(),
    bulkCreate: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
  };

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
    const result = await injectNestedDependencies(savedObjects, savedObjectsClient);
    expect(result).toMatchInlineSnapshot(`
Array [
  Object {
    "attributes": Object {},
    "id": "1",
    "references": Array [],
    "type": "index-pattern",
  },
]
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
    const result = await injectNestedDependencies(savedObjects, savedObjectsClient);
    expect(result).toMatchInlineSnapshot(`
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
    const result = await injectNestedDependencies(savedObjects, savedObjectsClient);
    expect(result).toMatchInlineSnapshot(`
Array [
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
    const result = await injectNestedDependencies(savedObjects, savedObjectsClient);
    expect(result).toMatchInlineSnapshot(`
Array [
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
]
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

  test('throws error when bulkGet returns an error', async () => {
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
          error: {
            statusCode: 404,
            message: 'Not found',
          },
        },
      ],
    });
    await expect(
      injectNestedDependencies(savedObjects, savedObjectsClient)
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Bad Request"`);
  });

  test(`doesn't deal with circular dependencies`, async () => {
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
    const result = await injectNestedDependencies(savedObjects, savedObjectsClient);
    expect(result).toMatchInlineSnapshot(`
Array [
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
