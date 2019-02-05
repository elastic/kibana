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

import { getExportDocuments, sortDocs } from './export';

describe('getExportDocuments', () => {
  test(`exports no documents when type and objects isn't passed in`, async () => {
    expect(await getExportDocuments({})).toEqual([]);
  });

  test('exports selected types and sorts them', async () => {
    const savedObjectsClient = {
      find: jest.fn().mockResolvedValueOnce({
        total: 2,
        saved_objects: [
          {
            id: '2',
            type: 'search',
            references: [
              {
                type: 'index-pattern',
                id: '1',
              },
            ],
          },
          {
            id: '1',
            type: 'index-pattern',
            references: [],
          },
        ],
      }),
    };
    const response = await getExportDocuments({
      savedObjectsClient,
      exportSizeLimit: 500,
      type: ['index-pattern', 'search'],
    });
    expect(response).toMatchInlineSnapshot(`
Array [
  Object {
    "id": "1",
    "references": Array [],
    "type": "index-pattern",
  },
  Object {
    "id": "2",
    "references": Array [
      Object {
        "id": "1",
        "type": "index-pattern",
      },
    ],
    "type": "search",
  },
]
`);
    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.find.mock.calls[0]).toEqual([
      {
        perPage: 500,
        type: ['index-pattern', 'search'],
      },
    ]);
  });

  test('export selected types throws error when exceeding exportSizeLimit', async () => {
    const savedObjectsClient = {
      find: jest.fn().mockResolvedValueOnce({
        total: 2,
        saved_objects: [
          {
            id: '2',
            type: 'search',
            references: [
              {
                type: 'index-pattern',
                id: '1',
              },
            ],
          },
          {
            id: '1',
            type: 'index-pattern',
            references: [],
          },
        ],
      }),
    };
    await expect(
      getExportDocuments({
        savedObjectsClient,
        exportSizeLimit: 1,
        type: ['index-pattern', 'search'],
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Export size limit of 1 reached"`);
  });

  test('exports selected objects and sorts them', async () => {
    const savedObjectsClient = {
      bulkGet: jest.fn().mockResolvedValueOnce({
        saved_objects: [
          {
            id: '2',
            type: 'search',
            references: [
              {
                type: 'index-pattern',
                id: '1',
              },
            ],
          },
          {
            id: '1',
            type: 'index-pattern',
            references: [],
          },
        ],
      }),
    };
    const response = await getExportDocuments({
      savedObjectsClient,
      objects: [
        {
          type: 'index-pattern',
          id: '1',
        },
        {
          type: 'search',
          id: '2',
        },
      ],
    });
    expect(response).toMatchInlineSnapshot(`
Array [
  Object {
    "id": "1",
    "references": Array [],
    "type": "index-pattern",
  },
  Object {
    "id": "2",
    "references": Array [
      Object {
        "id": "1",
        "type": "index-pattern",
      },
    ],
    "type": "search",
  },
]
`);
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.bulkGet.mock.calls[0]).toEqual([
      [
        {
          type: 'index-pattern',
          id: '1',
        },
        {
          type: 'search',
          id: '2',
        },
      ],
    ]);
  });
});

describe('sortDocs()', () => {
  test('should return on empty array', () => {
    expect(sortDocs([])).toEqual([]);
  });

  test('should not change sorted array', () => {
    const docs = [
      {
        id: '1',
        type: 'index-pattern',
        references: [],
      },
      {
        id: '2',
        type: 'search',
        references: [
          {
            type: 'index-pattern',
            id: '1',
          },
        ],
      },
    ];
    expect(sortDocs(docs)).toMatchInlineSnapshot(`
Array [
  Object {
    "id": "1",
    "references": Array [],
    "type": "index-pattern",
  },
  Object {
    "id": "2",
    "references": Array [
      Object {
        "id": "1",
        "type": "index-pattern",
      },
    ],
    "type": "search",
  },
]
`);
  });

  test('should not mutate parameter', () => {
    const docs = [
      {
        id: '2',
        type: 'search',
        references: [
          {
            type: 'index-pattern',
            id: '1',
          },
        ],
      },
      {
        id: '1',
        type: 'index-pattern',
        references: [],
      },
    ];
    expect(sortDocs(docs)).toMatchInlineSnapshot(`
Array [
  Object {
    "id": "1",
    "references": Array [],
    "type": "index-pattern",
  },
  Object {
    "id": "2",
    "references": Array [
      Object {
        "id": "1",
        "type": "index-pattern",
      },
    ],
    "type": "search",
  },
]
`);
    expect(docs).toMatchInlineSnapshot(`
Array [
  Object {
    "id": "2",
    "references": Array [
      Object {
        "id": "1",
        "type": "index-pattern",
      },
    ],
    "type": "search",
  },
  Object {
    "id": "1",
    "references": Array [],
    "type": "index-pattern",
  },
]
`);
  });

  test('should sort unordered array', () => {
    const docs = [
      {
        id: '5',
        type: 'dashboard',
        references: [
          {
            type: 'visualization',
            id: '3',
          },
          {
            type: 'visualization',
            id: '4',
          },
        ],
      },
      {
        id: '4',
        type: 'visualization',
        references: [
          {
            type: 'index-pattern',
            id: '1',
          },
        ],
      },
      {
        id: '3',
        type: 'visualization',
        references: [
          {
            type: 'search',
            id: '2',
          },
        ],
      },
      {
        id: '2',
        type: 'search',
        references: [
          {
            type: 'index-pattern',
            id: '1',
          },
        ],
      },
      {
        id: '1',
        type: 'index-pattern',
        references: [],
      },
    ];
    expect(sortDocs(docs)).toMatchInlineSnapshot(`
Array [
  Object {
    "id": "1",
    "references": Array [],
    "type": "index-pattern",
  },
  Object {
    "id": "4",
    "references": Array [
      Object {
        "id": "1",
        "type": "index-pattern",
      },
    ],
    "type": "visualization",
  },
  Object {
    "id": "2",
    "references": Array [
      Object {
        "id": "1",
        "type": "index-pattern",
      },
    ],
    "type": "search",
  },
  Object {
    "id": "3",
    "references": Array [
      Object {
        "id": "2",
        "type": "search",
      },
    ],
    "type": "visualization",
  },
  Object {
    "id": "5",
    "references": Array [
      Object {
        "id": "3",
        "type": "visualization",
      },
      Object {
        "id": "4",
        "type": "visualization",
      },
    ],
    "type": "dashboard",
  },
]
`);
  });

  test('detects circular dependencies', () => {
    const docs = [
      {
        id: '1',
        type: 'foo',
        references: [
          {
            type: 'foo',
            id: '2',
          },
        ],
      },
      {
        id: '2',
        type: 'foo',
        references: [
          {
            type: 'foo',
            id: '1',
          },
        ],
      },
    ];
    expect(() => sortDocs(docs)).toThrowErrorMatchingInlineSnapshot(`"Circular dependency"`);
  });
});
