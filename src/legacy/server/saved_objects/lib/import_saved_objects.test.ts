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
import { SavedObject } from '../service';
import {
  collectSavedObjects,
  extractErrors,
  importSavedObjects,
  resolveImportConflicts,
  splitOverwrites,
} from './import_saved_objects';

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
    "id": "2",
    "message": "Conflict",
    "statusCode": 409,
    "type": "dashboard",
  },
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
      `"Limit of 1 objects reached"`
    );
  });
});

describe('splitOverwrites()', () => {
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

  it('empty overwrites puts all objects into objectsToNotOverwrite', () => {
    const result = splitOverwrites(savedObjects, []);
    expect(result).toMatchInlineSnapshot(`
Object {
  "objectsToNotOverwrite": Array [
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
  "objectsToOverwrite": Array [],
}
`);
  });

  it('all objects in overwrites puts all objects into objectsToOverwrite', () => {
    const result = splitOverwrites(savedObjects, [
      {
        type: 'index-pattern',
        id: '1',
      },
      {
        type: 'search',
        id: '2',
      },
      {
        type: 'visualization',
        id: '3',
      },
      {
        type: 'dashboard',
        id: '4',
      },
    ]);
    expect(result).toMatchInlineSnapshot(`
Object {
  "objectsToNotOverwrite": Array [],
  "objectsToOverwrite": Array [
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
}
`);
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
      "id": "1",
      "message": "conflict",
      "statusCode": 409,
      "type": "index-pattern",
    },
    Object {
      "id": "2",
      "message": "conflict",
      "statusCode": 409,
      "type": "search",
    },
    Object {
      "id": "3",
      "message": "conflict",
      "statusCode": 409,
      "type": "visualization",
    },
    Object {
      "id": "4",
      "message": "conflict",
      "statusCode": 409,
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
      overwrites: [],
      savedObjectsClient,
      replaceReferences: [],
    });
    expect(result).toMatchInlineSnapshot(`
Object {
  "success": true,
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
          "references": Array [
            Object {
              "id": "3",
              "name": "panel_0",
              "type": "visualization",
            },
          ],
          "type": "dashboard",
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
    Array [
      Array [
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
          "references": Array [
            Object {
              "id": "3",
              "name": "panel_0",
              "type": "visualization",
            },
          ],
          "type": "dashboard",
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
    const result = await resolveImportConflicts({
      readStream,
      objectLimit: 4,
      overwrites: [],
      savedObjectsClient,
      replaceReferences: [],
    });
    expect(result).toMatchInlineSnapshot(`
Object {
  "errors": Array [
    Object {
      "id": "1",
      "message": "conflict",
      "statusCode": 409,
      "type": "index-pattern",
    },
    Object {
      "id": "2",
      "message": "conflict",
      "statusCode": 409,
      "type": "search",
    },
    Object {
      "id": "3",
      "message": "conflict",
      "statusCode": 409,
      "type": "visualization",
    },
    Object {
      "id": "4",
      "message": "conflict",
      "statusCode": 409,
      "type": "dashboard",
    },
  ],
  "success": false,
}
`);
  });
});
