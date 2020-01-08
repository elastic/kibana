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
import { SavedObject } from '../types';
import { importSavedObjects } from './import_saved_objects';
import { savedObjectsClientMock } from '../../mocks';

const emptyResponse = {
  saved_objects: [],
  total: 0,
  per_page: 0,
  page: 0,
};
describe('importSavedObjects()', () => {
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
      references: [],
    },
  ];
  const savedObjectsClient = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('returns early when no objects exist', async () => {
    const readStream = new Readable({
      objectMode: true,
      read() {
        this.push(null);
      },
    });
    const result = await importSavedObjects({
      readStream,
      objectLimit: 1,
      overwrite: false,
      savedObjectsClient,
      supportedTypes: [],
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "success": true,
        "successCount": 0,
      }
    `);
  });

  test('calls bulkCreate without overwrite', async () => {
    const readStream = new Readable({
      objectMode: true,
      read() {
        savedObjects.forEach(obj => this.push(obj));
        this.push(null);
      },
    });
    savedObjectsClient.find.mockResolvedValueOnce(emptyResponse);
    savedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: savedObjects,
    });
    const result = await importSavedObjects({
      readStream,
      objectLimit: 4,
      overwrite: false,
      savedObjectsClient,
      supportedTypes: ['index-pattern', 'search', 'visualization', 'dashboard'],
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
                "attributes": Object {
                  "title": "My Index Pattern",
                },
                "id": "1",
                "migrationVersion": Object {},
                "references": Array [],
                "type": "index-pattern",
              },
              Object {
                "attributes": Object {
                  "title": "My Search",
                },
                "id": "2",
                "migrationVersion": Object {},
                "references": Array [],
                "type": "search",
              },
              Object {
                "attributes": Object {
                  "title": "My Visualization",
                },
                "id": "3",
                "migrationVersion": Object {},
                "references": Array [],
                "type": "visualization",
              },
              Object {
                "attributes": Object {
                  "title": "My Dashboard",
                },
                "id": "4",
                "migrationVersion": Object {},
                "references": Array [],
                "type": "dashboard",
              },
            ],
            Object {
              "namespace": undefined,
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

  test('uses the provided namespace when present', async () => {
    const readStream = new Readable({
      objectMode: true,
      read() {
        savedObjects.forEach(obj => this.push(obj));
        this.push(null);
      },
    });
    savedObjectsClient.find.mockResolvedValueOnce(emptyResponse);
    savedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: savedObjects,
    });
    const result = await importSavedObjects({
      readStream,
      objectLimit: 4,
      overwrite: false,
      savedObjectsClient,
      supportedTypes: ['index-pattern', 'search', 'visualization', 'dashboard'],
      namespace: 'foo',
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
                "attributes": Object {
                  "title": "My Index Pattern",
                },
                "id": "1",
                "migrationVersion": Object {},
                "references": Array [],
                "type": "index-pattern",
              },
              Object {
                "attributes": Object {
                  "title": "My Search",
                },
                "id": "2",
                "migrationVersion": Object {},
                "references": Array [],
                "type": "search",
              },
              Object {
                "attributes": Object {
                  "title": "My Visualization",
                },
                "id": "3",
                "migrationVersion": Object {},
                "references": Array [],
                "type": "visualization",
              },
              Object {
                "attributes": Object {
                  "title": "My Dashboard",
                },
                "id": "4",
                "migrationVersion": Object {},
                "references": Array [],
                "type": "dashboard",
              },
            ],
            Object {
              "namespace": "foo",
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
      objectMode: true,
      read() {
        savedObjects.forEach(obj => this.push(obj));
        this.push(null);
      },
    });
    savedObjectsClient.find.mockResolvedValueOnce(emptyResponse);
    savedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: savedObjects,
    });
    const result = await importSavedObjects({
      readStream,
      objectLimit: 4,
      overwrite: true,
      savedObjectsClient,
      supportedTypes: ['index-pattern', 'search', 'visualization', 'dashboard'],
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
                "attributes": Object {
                  "title": "My Index Pattern",
                },
                "id": "1",
                "migrationVersion": Object {},
                "references": Array [],
                "type": "index-pattern",
              },
              Object {
                "attributes": Object {
                  "title": "My Search",
                },
                "id": "2",
                "migrationVersion": Object {},
                "references": Array [],
                "type": "search",
              },
              Object {
                "attributes": Object {
                  "title": "My Visualization",
                },
                "id": "3",
                "migrationVersion": Object {},
                "references": Array [],
                "type": "visualization",
              },
              Object {
                "attributes": Object {
                  "title": "My Dashboard",
                },
                "id": "4",
                "migrationVersion": Object {},
                "references": Array [],
                "type": "dashboard",
              },
            ],
            Object {
              "namespace": undefined,
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

  test('extracts errors for conflicts', async () => {
    const readStream = new Readable({
      objectMode: true,
      read() {
        savedObjects.forEach(obj => this.push(obj));
        this.push(null);
      },
    });
    savedObjectsClient.find.mockResolvedValueOnce(emptyResponse);
    savedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: savedObjects.map(savedObject => ({
        type: savedObject.type,
        id: savedObject.id,
        error: {
          statusCode: 409,
          message: 'conflict',
        },
        attributes: {},
        references: [],
      })),
    });
    const result = await importSavedObjects({
      readStream,
      objectLimit: 4,
      overwrite: false,
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
      objectMode: true,
      read() {
        this.push({
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
        });
        this.push({
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
        });
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
          attributes: {},
          references: [],
        },
      ],
    });
    const result = await importSavedObjects({
      readStream,
      objectLimit: 4,
      overwrite: false,
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

  test('validates supported types', async () => {
    const readStream = new Readable({
      objectMode: true,
      read() {
        savedObjects.forEach(obj => this.push(obj));
        this.push({ id: '1', type: 'wigwags', attributes: { title: 'my title' }, references: [] });
        this.push(null);
      },
    });
    savedObjectsClient.find.mockResolvedValueOnce(emptyResponse);
    savedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: savedObjects,
    });
    const result = await importSavedObjects({
      readStream,
      objectLimit: 5,
      overwrite: false,
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
        "successCount": 4,
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
              Object {
                "attributes": Object {
                  "title": "My Search",
                },
                "id": "2",
                "migrationVersion": Object {},
                "references": Array [],
                "type": "search",
              },
              Object {
                "attributes": Object {
                  "title": "My Visualization",
                },
                "id": "3",
                "migrationVersion": Object {},
                "references": Array [],
                "type": "visualization",
              },
              Object {
                "attributes": Object {
                  "title": "My Dashboard",
                },
                "id": "4",
                "migrationVersion": Object {},
                "references": Array [],
                "type": "dashboard",
              },
            ],
            Object {
              "namespace": undefined,
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
});
