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
    const result = await resolveImportErrors({
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
    const result = await resolveImportErrors({
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
    const result = await resolveImportErrors({
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
    const result = await resolveImportErrors({
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
