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
import { resolveImportErrors } from './resolve_import_errors';

describe('resolveImportErrors()', () => {
  const savedObjects: SavedObject[] = [
    {
      id: '1',
      type: 'index-pattern',
      attributes: {
        title: 'My Index Pattern',
      },
      references: [],
    },
    {
      id: '2',
      type: 'search',
      attributes: {
        title: 'My Search',
      },
      references: [],
    },
    {
      id: '3',
      type: 'visualization',
      attributes: {
        title: 'My Visualization',
      },
      references: [],
    },
    {
      id: '4',
      type: 'dashboard',
      attributes: {
        title: 'My Dashboard',
      },
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
    jest.resetAllMocks();
  });

  test('works with empty parameters', async () => {
    const readStream = new Readable({
      read() {
        savedObjects.forEach(obj => this.push(JSON.stringify(obj) + '\n'));
        this.push(null);
      },
    });
    savedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: [],
    });
    const result = await resolveImportErrors({
      readStream,
      objectLimit: 4,
      retries: [],
      savedObjectsClient,
      supportedTypes: ['index-pattern', 'search', 'visualization', 'dashboard'],
    });
    expect(result).toMatchInlineSnapshot(`
Object {
  "success": true,
  "successCount": 0,
}
`);
    expect(savedObjectsClient.bulkCreate).toMatchInlineSnapshot(`[MockFunction]`);
  });

  test('works with retries', async () => {
    const readStream = new Readable({
      read() {
        savedObjects.forEach(obj => this.push(JSON.stringify(obj) + '\n'));
        this.push(null);
      },
    });
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: savedObjects.filter(obj => obj.type === 'visualization' && obj.id === '3'),
    });
    const result = await resolveImportErrors({
      readStream,
      objectLimit: 4,
      retries: [
        {
          type: 'visualization',
          id: '3',
          replaceReferences: [],
          overwrite: false,
        },
      ],
      savedObjectsClient,
      supportedTypes: ['index-pattern', 'search', 'visualization', 'dashboard'],
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
          "attributes": Object {
            "title": "My Visualization",
          },
          "id": "3",
          "migrationVersion": Object {},
          "references": Array [],
          "type": "visualization",
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
      saved_objects: savedObjects.filter(obj => obj.type === 'index-pattern' && obj.id === '1'),
    });
    const result = await resolveImportErrors({
      readStream,
      objectLimit: 4,
      retries: [
        {
          type: 'index-pattern',
          id: '1',
          overwrite: true,
          replaceReferences: [],
        },
      ],
      savedObjectsClient,
      supportedTypes: ['index-pattern', 'search', 'visualization', 'dashboard'],
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
          "attributes": Object {
            "title": "My Index Pattern",
          },
          "id": "1",
          "migrationVersion": Object {},
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
      saved_objects: savedObjects.filter(obj => obj.type === 'dashboard' && obj.id === '4'),
    });
    const result = await resolveImportErrors({
      readStream,
      objectLimit: 4,
      retries: [
        {
          type: 'dashboard',
          id: '4',
          overwrite: false,
          replaceReferences: [
            {
              type: 'visualization',
              from: '3',
              to: '13',
            },
          ],
        },
      ],
      savedObjectsClient,
      supportedTypes: ['index-pattern', 'search', 'visualization', 'dashboard'],
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
          "attributes": Object {
            "title": "My Dashboard",
          },
          "id": "4",
          "migrationVersion": Object {},
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

  test('extracts errors for conflicts', async () => {
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
    const result = await resolveImportErrors({
      readStream,
      objectLimit: 4,
      retries: savedObjects.map(obj => ({
        type: obj.type,
        id: obj.id,
        overwrite: false,
        replaceReferences: [],
      })),
      savedObjectsClient,
      supportedTypes: ['index-pattern', 'search', 'visualization', 'dashboard'],
    });
    expect(result).toMatchInlineSnapshot(`
Object {
  "errors": Array [
    Object {
      "error": Object {
        "type": "conflict",
      },
      "id": "1",
      "title": "My Index Pattern",
      "type": "index-pattern",
    },
    Object {
      "error": Object {
        "type": "conflict",
      },
      "id": "2",
      "title": "My Search",
      "type": "search",
    },
    Object {
      "error": Object {
        "type": "conflict",
      },
      "id": "3",
      "title": "My Visualization",
      "type": "visualization",
    },
    Object {
      "error": Object {
        "type": "conflict",
      },
      "id": "4",
      "title": "My Dashboard",
      "type": "dashboard",
    },
  ],
  "success": false,
  "successCount": 0,
}
`);
  });

  test('validates references', async () => {
    const readStream = new Readable({
      read() {
        this.push(
          JSON.stringify({
            id: '1',
            type: 'search',
            attributes: {
              title: 'My Search',
            },
            references: [
              {
                name: 'ref_0',
                type: 'index-pattern',
                id: '2',
              },
            ],
          }) + '\n'
        );
        this.push(
          JSON.stringify({
            id: '3',
            type: 'visualization',
            attributes: {
              title: 'My Visualization',
            },
            references: [
              {
                name: 'ref_0',
                type: 'search',
                id: '1',
              },
            ],
          }) + '\n'
        );
        this.push(null);
      },
    });
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          type: 'index-pattern',
          id: '2',
          error: {
            statusCode: 404,
            message: 'Not found',
          },
        },
      ],
    });
    const result = await resolveImportErrors({
      readStream,
      objectLimit: 2,
      retries: [
        {
          type: 'search',
          id: '1',
          overwrite: false,
          replaceReferences: [],
        },
        {
          type: 'visualization',
          id: '3',
          overwrite: false,
          replaceReferences: [],
        },
      ],
      savedObjectsClient,
      supportedTypes: ['index-pattern', 'search', 'visualization', 'dashboard'],
    });
    expect(result).toMatchInlineSnapshot(`
Object {
  "errors": Array [
    Object {
      "error": Object {
        "blocking": Array [
          Object {
            "id": "3",
            "type": "visualization",
          },
        ],
        "references": Array [
          Object {
            "id": "2",
            "type": "index-pattern",
          },
        ],
        "type": "missing_references",
      },
      "id": "1",
      "title": "My Search",
      "type": "search",
    },
  ],
  "success": false,
  "successCount": 0,
}
`);
    expect(savedObjectsClient.bulkGet).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Array [
        Object {
          "fields": Array [
            "id",
          ],
          "id": "2",
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

  test('validates object types', async () => {
    const readStream = new Readable({
      read() {
        savedObjects.forEach(obj => this.push(JSON.stringify(obj) + '\n'));
        this.push('{"id":"1","type":"wigwags","attributes":{"title":"my title"},"references":[]}');
        this.push(null);
      },
    });
    savedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: [],
    });
    const result = await resolveImportErrors({
      readStream,
      objectLimit: 5,
      retries: [
        {
          id: 'i',
          type: 'wigwags',
          overwrite: false,
          replaceReferences: [],
        },
      ],
      savedObjectsClient,
      supportedTypes: ['index-pattern', 'search', 'visualization', 'dashboard'],
    });
    expect(result).toMatchInlineSnapshot(`
Object {
  "errors": Array [
    Object {
      "error": Object {
        "type": "unsupported_type",
      },
      "id": "1",
      "title": "my title",
      "type": "wigwags",
    },
  ],
  "success": false,
  "successCount": 0,
}
`);
    expect(savedObjectsClient.bulkCreate).toMatchInlineSnapshot(`[MockFunction]`);
  });
});
