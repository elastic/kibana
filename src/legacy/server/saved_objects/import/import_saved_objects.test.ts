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
import { importSavedObjects } from './import_saved_objects';

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
