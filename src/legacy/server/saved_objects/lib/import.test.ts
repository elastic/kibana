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

import { Readable } from 'stream';
import {
  createConcatStream,
  createListStream,
  createPromiseFromStreams,
} from '../../../utils/streams';
import { SavedObject } from '../service';
import {
  collectSavedObjects,
  createLimitStream,
  createObjectsFilter,
  extractErrors,
  importSavedObjects,
  resolveImportConflicts,
} from './import';

describe('extractErrors()', () => {
  test('returns empty array when no errors exist', () => {
    const savedObjects: SavedObject[] = [];
    const result = extractErrors(savedObjects);
    expect(result).toMatchInlineSnapshot(`Array []`);
  });

  test('extracts errors from saved objects', () => {
    const savedObjects: SavedObject[] = [
      {
        id: '1',
        type: 'dashboard',
        attributes: {},
        references: [],
      },
      {
        id: '2',
        type: 'dashboard',
        attributes: {},
        references: [],
        error: {
          statusCode: 409,
          message: 'Conflict',
        },
      },
    ];
    const result = extractErrors(savedObjects);
    expect(result).toMatchInlineSnapshot(`
Array [
  Object {
    "error": Object {
      "message": "Conflict",
      "statusCode": 409,
    },
    "id": "2",
    "type": "dashboard",
  },
]
`);
  });
});

describe('createLimitStream()', () => {
  test('limit of 5 allows 5 items through', async () => {
    await createPromiseFromStreams([createListStream([1, 2, 3, 4, 5]), createLimitStream(5)]);
  });

  test('limit of 5 errors out when 6 items are through', async () => {
    await expect(
      createPromiseFromStreams([createListStream([1, 2, 3, 4, 5, 6]), createLimitStream(5)])
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Can't import more than 5 objects"`);
  });

  test('send the values on the output stream', async () => {
    const result = await createPromiseFromStreams([
      createListStream([1, 2, 3]),
      createLimitStream(3),
      createConcatStream([]),
    ]);

    expect(result).toMatchInlineSnapshot(`
Array [
  1,
  2,
  3,
]
`);
  });
});

describe('collectSavedObjects()', () => {
  test('collects nothing when stream is empty', async () => {
    const readStream = new Readable({
      read() {
        this.push(null);
      },
    });
    const objects = await collectSavedObjects(readStream, 10);
    expect(objects).toMatchInlineSnapshot(`Array []`);
  });

  test('collects objects from stream', async () => {
    const readStream = new Readable({
      read() {
        this.push('{"foo":true}');
        this.push(null);
      },
    });
    const objects = await collectSavedObjects(readStream, 1);
    expect(objects).toMatchInlineSnapshot(`
Array [
  Object {
    "foo": true,
  },
]
`);
  });

  test('filters out empty lines', async () => {
    const readStream = new Readable({
      read() {
        this.push('{"foo":true}\n\n');
        this.push(null);
      },
    });
    const objects = await collectSavedObjects(readStream, 1);
    expect(objects).toMatchInlineSnapshot(`
Array [
  Object {
    "foo": true,
  },
]
`);
  });

  test('throws error when object limit is reached', async () => {
    const readStream = new Readable({
      read() {
        this.push('{"foo":true}\n');
        this.push('{"bar":true}\n');
        this.push(null);
      },
    });
    await expect(collectSavedObjects(readStream, 1)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Can't import more than 1 objects"`
    );
  });
});

describe('createObjectsFilter()', () => {
  test('filters should return false when contains empty parameters', () => {
    const fn = createObjectsFilter([], [], []);
    expect(fn({ type: 'a', id: '1', attributes: {}, references: [] })).toEqual(false);
  });

  test('filters should exclude skips', () => {
    const fn = createObjectsFilter(
      [
        {
          type: 'a',
          id: '1',
        },
      ],
      [],
      [
        {
          type: 'b',
          from: '1',
          to: '2',
        },
      ]
    );
    expect(
      fn({
        type: 'a',
        id: '1',
        attributes: {},
        references: [{ name: 'ref_0', type: 'b', id: '1' }],
      })
    ).toEqual(false);
    expect(
      fn({
        type: 'a',
        id: '2',
        attributes: {},
        references: [{ name: 'ref_0', type: 'b', id: '1' }],
      })
    ).toEqual(true);
  });

  test('filter should include references to replace', () => {
    const fn = createObjectsFilter(
      [],
      [],
      [
        {
          type: 'b',
          from: '1',
          to: '2',
        },
      ]
    );
    expect(
      fn({
        type: 'a',
        id: '1',
        attributes: {},
        references: [
          {
            name: 'ref_0',
            type: 'b',
            id: '1',
          },
        ],
      })
    ).toEqual(true);
    expect(
      fn({
        type: 'a',
        id: '1',
        attributes: {},
        references: [
          {
            name: 'ref_0',
            type: 'b',
            id: '2',
          },
        ],
      })
    ).toEqual(false);
  });

  test('filter should include objects to overwrite', () => {
    const fn = createObjectsFilter(
      [],
      [
        {
          type: 'a',
          id: '1',
        },
      ],
      []
    );
    expect(fn({ type: 'a', id: '1', attributes: {}, references: [] })).toEqual(true);
    expect(fn({ type: 'a', id: '2', attributes: {}, references: [] })).toEqual(false);
  });

  test('filter should work with skips, overwrites and replaceReferences', () => {
    const fn = createObjectsFilter(
      [
        {
          type: 'a',
          id: '1',
        },
      ],
      [
        {
          type: 'a',
          id: '2',
        },
      ],
      [
        {
          type: 'b',
          from: '1',
          to: '2',
        },
      ]
    );
    expect(
      fn({
        type: 'a',
        id: '1',
        attributes: {},
        references: [
          {
            name: 'ref_0',
            type: 'b',
            id: '1',
          },
        ],
      })
    ).toEqual(false);
    expect(
      fn({
        type: 'a',
        id: '2',
        attributes: {},
        references: [
          {
            name: 'ref_0',
            type: 'b',
            id: '2',
          },
        ],
      })
    ).toEqual(true);
    expect(
      fn({
        type: 'a',
        id: '3',
        attributes: {},
        references: [
          {
            name: 'ref_0',
            type: 'b',
            id: '1',
          },
        ],
      })
    ).toEqual(true);
  });
});

describe('importSavedObjects()', () => {
  const savedObjects: SavedObject[] = [
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
      references: [],
    },
    {
      id: '3',
      type: 'visualization',
      attributes: {},
      references: [],
    },
    {
      id: '4',
      type: 'dashboard',
      attributes: {},
      references: [],
    },
  ];
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
    savedObjectsClient.bulkCreate.mockReset();
    savedObjectsClient.bulkGet.mockReset();
    savedObjectsClient.create.mockReset();
    savedObjectsClient.delete.mockReset();
    savedObjectsClient.find.mockReset();
    savedObjectsClient.get.mockReset();
    savedObjectsClient.update.mockReset();
  });

  test('calls bulkCreate without overwrite', async () => {
    const readStream = new Readable({
      read() {
        savedObjects.forEach(obj => this.push(JSON.stringify(obj) + '\n'));
        this.push(null);
      },
    });
    savedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: savedObjects,
    });
    const result = await importSavedObjects({
      readStream,
      objectLimit: 4,
      overwrite: false,
      savedObjectsClient,
    });
    expect(result).toMatchInlineSnapshot(`
Object {
  "success": true,
  "successCount": 4,
}
`);
    expect(savedObjectsClient.bulkCreate).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
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
          "references": Array [],
          "type": "search",
        },
        Object {
          "attributes": Object {},
          "id": "3",
          "references": Array [],
          "type": "visualization",
        },
        Object {
          "attributes": Object {},
          "id": "4",
          "references": Array [],
          "type": "dashboard",
        },
      ],
      Object {
        "overwrite": false,
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

  test('calls bulkCreate with overwrite', async () => {
    const readStream = new Readable({
      read() {
        savedObjects.forEach(obj => this.push(JSON.stringify(obj) + '\n'));
        this.push(null);
      },
    });
    savedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: savedObjects,
    });
    const result = await importSavedObjects({
      readStream,
      objectLimit: 4,
      overwrite: true,
      savedObjectsClient,
    });
    expect(result).toMatchInlineSnapshot(`
Object {
  "success": true,
  "successCount": 4,
}
`);
    expect(savedObjectsClient.bulkCreate).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
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
          "references": Array [],
          "type": "search",
        },
        Object {
          "attributes": Object {},
          "id": "3",
          "references": Array [],
          "type": "visualization",
        },
        Object {
          "attributes": Object {},
          "id": "4",
          "references": Array [],
          "type": "dashboard",
        },
      ],
      Object {
        "overwrite": true,
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

  test('extracts errors', async () => {
    const readStream = new Readable({
      read() {
        savedObjects.forEach(obj => this.push(JSON.stringify(obj) + '\n'));
        this.push(null);
      },
    });
    savedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: savedObjects.map(savedObject => ({
        type: savedObject.type,
        id: savedObject.id,
        error: {
          statusCode: 409,
          message: 'conflict',
        },
      })),
    });
    const result = await importSavedObjects({
      readStream,
      objectLimit: 4,
      overwrite: false,
      savedObjectsClient,
    });
    expect(result).toMatchInlineSnapshot(`
Object {
  "errors": Array [
    Object {
      "error": Object {
        "message": "conflict",
        "statusCode": 409,
      },
      "id": "1",
      "type": "index-pattern",
    },
    Object {
      "error": Object {
        "message": "conflict",
        "statusCode": 409,
      },
      "id": "2",
      "type": "search",
    },
    Object {
      "error": Object {
        "message": "conflict",
        "statusCode": 409,
      },
      "id": "3",
      "type": "visualization",
    },
    Object {
      "error": Object {
        "message": "conflict",
        "statusCode": 409,
      },
      "id": "4",
      "type": "dashboard",
    },
  ],
  "success": false,
  "successCount": 0,
}
`);
  });
});

describe('resolveImportConflicts()', () => {
  const savedObjects: SavedObject[] = [
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
      references: [],
    },
    {
      id: '3',
      type: 'visualization',
      attributes: {},
      references: [],
    },
    {
      id: '4',
      type: 'dashboard',
      attributes: {},
      references: [
        {
          name: 'panel_0',
          type: 'visualization',
          id: '3',
        },
      ],
    },
  ];
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
    savedObjectsClient.bulkCreate.mockReset();
    savedObjectsClient.bulkGet.mockReset();
    savedObjectsClient.create.mockReset();
    savedObjectsClient.delete.mockReset();
    savedObjectsClient.find.mockReset();
    savedObjectsClient.get.mockReset();
    savedObjectsClient.update.mockReset();
  });

  test('works with empty parameters', async () => {
    const readStream = new Readable({
      read() {
        savedObjects.forEach(obj => this.push(JSON.stringify(obj) + '\n'));
        this.push(null);
      },
    });
    savedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: savedObjects,
    });
    const result = await resolveImportConflicts({
      readStream,
      objectLimit: 4,
      skips: [],
      overwrites: [],
      savedObjectsClient,
      replaceReferences: [],
    });
    expect(result).toMatchInlineSnapshot(`
Object {
  "success": true,
  "successCount": 0,
}
`);
    expect(savedObjectsClient.bulkCreate).toMatchInlineSnapshot(`[MockFunction]`);
  });

  test('works with skips', async () => {
    const readStream = new Readable({
      read() {
        savedObjects.forEach(obj => this.push(JSON.stringify(obj) + '\n'));
        this.push(null);
      },
    });
    savedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: savedObjects,
    });
    const result = await resolveImportConflicts({
      readStream,
      objectLimit: 4,
      skips: [
        {
          type: 'dashboard',
          id: '4',
        },
      ],
      overwrites: [],
      savedObjectsClient,
      replaceReferences: [
        {
          type: 'visualization',
          from: '3',
          to: '30',
        },
      ],
    });
    expect(result).toMatchInlineSnapshot(`
Object {
  "success": true,
  "successCount": 0,
}
`);
    expect(savedObjectsClient.bulkCreate).toMatchInlineSnapshot(`[MockFunction]`);
  });

  test('works with overwrites', async () => {
    const readStream = new Readable({
      read() {
        savedObjects.forEach(obj => this.push(JSON.stringify(obj) + '\n'));
        this.push(null);
      },
    });
    savedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: savedObjects,
    });
    const result = await resolveImportConflicts({
      readStream,
      objectLimit: 4,
      skips: [],
      overwrites: [
        {
          type: 'index-pattern',
          id: '1',
        },
      ],
      savedObjectsClient,
      replaceReferences: [],
    });
    expect(result).toMatchInlineSnapshot(`
Object {
  "success": true,
  "successCount": 1,
}
`);
    expect(savedObjectsClient.bulkCreate).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Array [
        Object {
          "attributes": Object {},
          "id": "1",
          "references": Array [],
          "type": "index-pattern",
        },
      ],
      Object {
        "overwrite": true,
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

  test('works wtih replaceReferences', async () => {
    const readStream = new Readable({
      read() {
        savedObjects.forEach(obj => this.push(JSON.stringify(obj) + '\n'));
        this.push(null);
      },
    });
    savedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: savedObjects,
    });
    const result = await resolveImportConflicts({
      readStream,
      objectLimit: 4,
      skips: [],
      overwrites: [],
      savedObjectsClient,
      replaceReferences: [
        {
          type: 'visualization',
          from: '3',
          to: '13',
        },
      ],
    });
    expect(result).toMatchInlineSnapshot(`
Object {
  "success": true,
  "successCount": 1,
}
`);
    expect(savedObjectsClient.bulkCreate).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Array [
        Object {
          "attributes": Object {},
          "id": "4",
          "references": Array [
            Object {
              "id": "13",
              "name": "panel_0",
              "type": "visualization",
            },
          ],
          "type": "dashboard",
        },
      ],
      Object {
        "overwrite": true,
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
