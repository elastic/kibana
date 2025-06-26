/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { SavedObject, SavedObjectsType } from '@kbn/core-saved-objects-server';
import { SavedObjectTypeRegistry } from '@kbn/core-saved-objects-base-server-internal';
import { SavedObjectsExporter } from './saved_objects_exporter';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { Readable } from 'stream';
import { createPromiseFromStreams, createConcatStream } from '@kbn/utils';
import { EXPORT_ALL_TYPES_TOKEN } from './constants';

async function readStreamToCompletion(stream: Readable): Promise<Array<SavedObject<any>>> {
  return createPromiseFromStreams([stream, createConcatStream([])]);
}

const createType = (parts: Partial<SavedObjectsType>): SavedObjectsType => ({
  name: 'type',
  namespaceType: 'single',
  hidden: false,
  mappings: { properties: {} },
  ...parts,
});

const exportSizeLimit = 10000;
const request = httpServerMock.createKibanaRequest();

describe('getSortedObjectsForExport()', () => {
  let logger: MockedLogger;
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let typeRegistry: SavedObjectTypeRegistry;
  let exporter: SavedObjectsExporter;

  beforeEach(() => {
    logger = loggerMock.create();
    typeRegistry = new SavedObjectTypeRegistry();
    savedObjectsClient = savedObjectsClientMock.create();
    exporter = createExporter();
  });

  const createExporter = () => {
    return new SavedObjectsExporter({
      exportSizeLimit,
      logger,
      savedObjectsClient,
      typeRegistry,
    });
  };

  describe('#exportByTypes', () => {
    test('exports selected types and sorts them', async () => {
      savedObjectsClient.find.mockResolvedValueOnce({
        total: 2,
        saved_objects: [
          {
            id: '2',
            type: 'search',
            attributes: {},
            score: 1,
            references: [
              {
                name: 'name',
                type: 'index-pattern',
                id: '1',
              },
            ],
          },
          {
            id: '1',
            type: 'index-pattern',
            attributes: {},
            score: 1,
            references: [],
          },
        ],
        per_page: 1000,
        page: 0,
      });
      const exportStream = await exporter.exportByTypes({
        request,
        types: ['index-pattern', 'search'],
      });

      const response = await readStreamToCompletion(exportStream);

      expect(response).toMatchInlineSnapshot(`
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
                "name": "name",
                "type": "index-pattern",
              },
            ],
            "type": "search",
          },
          Object {
            "excludedObjects": Array [],
            "excludedObjectsCount": 0,
            "exportedCount": 2,
            "missingRefCount": 0,
            "missingReferences": Array [],
          },
        ]
      `);
      expect(savedObjectsClient.find).toMatchInlineSnapshot(`
        [MockFunction] {
          "calls": Array [
            Array [
              Object {
                "hasReference": undefined,
                "hasReferenceOperator": undefined,
                "namespaces": undefined,
                "perPage": 1000,
                "pit": Object {
                  "id": "some_pit_id",
                  "keepAlive": "2m",
                },
                "search": undefined,
                "searchAfter": undefined,
                "sortField": "updated_at",
                "sortOrder": "desc",
                "type": Array [
                  "index-pattern",
                  "search",
                ],
              },
              undefined,
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

    describe('pages through results with PIT', () => {
      function generateHits(
        hitCount: number,
        {
          attributes = {},
          sort = [],
          type = 'index-pattern',
          idPrefix = '',
        }: {
          attributes?: Record<string, unknown>;
          sort?: string[];
          type?: string;
          idPrefix?: string;
        } = {}
      ) {
        const hits = [];
        for (let i = 1; i <= hitCount; i++) {
          hits.push({
            id: `${idPrefix}${i}`,
            type,
            attributes,
            sort,
            score: 1,
            references: [],
          });
        }
        return hits;
      }

      describe('<1k hits', () => {
        const mockHits = generateHits(20);

        test('requests a single page', async () => {
          savedObjectsClient.find.mockResolvedValueOnce({
            total: 20,
            saved_objects: mockHits,
            per_page: 1000,
            page: 0,
          });

          const exportStream = await exporter.exportByTypes({
            request,
            types: ['index-pattern'],
          });

          const response = await readStreamToCompletion(exportStream);

          expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);
          expect(response[response.length - 1]).toMatchInlineSnapshot(`
            Object {
              "excludedObjects": Array [],
              "excludedObjectsCount": 0,
              "exportedCount": 20,
              "missingRefCount": 0,
              "missingReferences": Array [],
            }
          `);
        });

        test('opens and closes PIT', async () => {
          savedObjectsClient.find.mockResolvedValueOnce({
            total: 20,
            saved_objects: mockHits,
            per_page: 1000,
            page: 0,
            pit_id: 'abc123',
          });

          const exportStream = await exporter.exportByTypes({
            request,
            types: ['index-pattern'],
          });

          await readStreamToCompletion(exportStream);

          expect(savedObjectsClient.openPointInTimeForType).toHaveBeenCalledTimes(1);
          expect(savedObjectsClient.closePointInTime).toHaveBeenCalledTimes(1);
        });

        test('passes correct PIT ID to `find`', async () => {
          savedObjectsClient.openPointInTimeForType.mockResolvedValueOnce({
            id: 'abc123',
          });
          savedObjectsClient.find.mockResolvedValueOnce({
            total: 20,
            saved_objects: mockHits,
            per_page: 1000,
            page: 0,
          });

          const exportStream = await exporter.exportByTypes({
            request,
            types: ['index-pattern'],
          });

          await readStreamToCompletion(exportStream);

          expect(savedObjectsClient.find).toHaveBeenCalledWith(
            expect.objectContaining({
              pit: expect.objectContaining({ id: 'abc123', keepAlive: '2m' }),
              sortField: 'updated_at',
              sortOrder: 'desc',
              type: ['index-pattern'],
            }),
            undefined // PointInTimeFinder adds `internalOptions`, which is undefined in this case
          );
        });
      });

      describe('>1k hits', () => {
        const firstMockHits = generateHits(1000, { sort: ['a', 'b'] });
        const secondMockHits = generateHits(500, { idPrefix: 'second-hit-' });

        test('requests multiple pages', async () => {
          savedObjectsClient.find.mockResolvedValueOnce({
            total: 1500,
            saved_objects: firstMockHits,
            per_page: 1000,
            page: 0,
          });
          savedObjectsClient.find.mockResolvedValueOnce({
            total: 1500,
            saved_objects: secondMockHits,
            per_page: 500,
            page: 1,
          });

          const exportStream = await exporter.exportByTypes({
            request,
            types: ['index-pattern'],
          });

          const response = await readStreamToCompletion(exportStream);

          expect(savedObjectsClient.find).toHaveBeenCalledTimes(2);
          expect(response[response.length - 1]).toMatchInlineSnapshot(`
            Object {
              "excludedObjects": Array [],
              "excludedObjectsCount": 0,
              "exportedCount": 1500,
              "missingRefCount": 0,
              "missingReferences": Array [],
            }
          `);
        });

        test('opens and closes PIT', async () => {
          savedObjectsClient.find.mockResolvedValueOnce({
            total: 1500,
            saved_objects: firstMockHits,
            per_page: 1000,
            page: 0,
            pit_id: 'abc123',
          });
          savedObjectsClient.find.mockResolvedValueOnce({
            total: 1500,
            saved_objects: secondMockHits,
            per_page: 500,
            page: 1,
            pit_id: 'abc123',
          });

          const exportStream = await exporter.exportByTypes({
            request,
            types: ['index-pattern'],
          });

          await readStreamToCompletion(exportStream);

          expect(savedObjectsClient.openPointInTimeForType).toHaveBeenCalledTimes(1);
          expect(savedObjectsClient.closePointInTime).toHaveBeenCalledTimes(1);
        });

        test('passes sort values to searchAfter', async () => {
          savedObjectsClient.find.mockResolvedValueOnce({
            total: 1500,
            saved_objects: firstMockHits,
            per_page: 1000,
            page: 0,
          });
          savedObjectsClient.find.mockResolvedValueOnce({
            total: 1500,
            saved_objects: secondMockHits,
            per_page: 500,
            page: 1,
          });

          const exportStream = await exporter.exportByTypes({
            request,
            types: ['index-pattern'],
          });

          await readStreamToCompletion(exportStream);

          expect(savedObjectsClient.find.mock.calls[1][0]).toEqual(
            expect.objectContaining({
              searchAfter: ['a', 'b'],
            })
          );
        });
      });
    });

    test('applies the export transforms', async () => {
      typeRegistry.registerType({
        name: 'foo',
        mappings: { properties: {} },
        namespaceType: 'single',
        hidden: false,
        management: {
          importableAndExportable: true,
          onExport: (ctx, objects) => {
            objects.forEach((obj: SavedObject<any>) => {
              obj.attributes.foo = 'modified';
            });
            return objects;
          },
        },
      });
      exporter = new SavedObjectsExporter({
        exportSizeLimit,
        logger,
        savedObjectsClient,
        typeRegistry,
      });

      savedObjectsClient.find.mockResolvedValueOnce({
        total: 1,
        saved_objects: [
          {
            id: '1',
            type: 'foo',
            attributes: {
              foo: 'initial',
            },
            score: 0,
            references: [],
          },
        ],
        per_page: 1,
        page: 0,
      });
      const exportStream = await exporter.exportByTypes({
        request,
        types: ['foo'],
        excludeExportDetails: true,
      });

      const response = await readStreamToCompletion(exportStream);

      expect(response).toHaveLength(1);
      expect(response[0].attributes.foo).toEqual('modified');
    });

    test('omits the `namespaces` property from the export', async () => {
      savedObjectsClient.find.mockResolvedValueOnce({
        total: 2,
        saved_objects: [
          {
            id: '2',
            type: 'search',
            attributes: {},
            namespaces: ['foo', 'bar'],
            score: 0,
            references: [
              {
                name: 'name',
                type: 'index-pattern',
                id: '1',
              },
            ],
          },
          {
            id: '1',
            type: 'index-pattern',
            attributes: {},
            namespaces: ['foo', 'bar'],
            score: 0,
            references: [],
          },
        ],
        per_page: 1,
        page: 0,
      });
      const exportStream = await exporter.exportByTypes({
        request,
        types: ['index-pattern', 'search'],
      });

      const response = await readStreamToCompletion(exportStream);

      expect(response).toMatchInlineSnapshot(`
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
                "name": "name",
                "type": "index-pattern",
              },
            ],
            "type": "search",
          },
          Object {
            "excludedObjects": Array [],
            "excludedObjectsCount": 0,
            "exportedCount": 2,
            "missingRefCount": 0,
            "missingReferences": Array [],
          },
        ]
      `);
      expect(savedObjectsClient.find).toMatchInlineSnapshot(`
        [MockFunction] {
          "calls": Array [
            Array [
              Object {
                "hasReference": undefined,
                "hasReferenceOperator": undefined,
                "namespaces": undefined,
                "perPage": 1000,
                "pit": Object {
                  "id": "some_pit_id",
                  "keepAlive": "2m",
                },
                "search": undefined,
                "searchAfter": undefined,
                "sortField": "updated_at",
                "sortOrder": "desc",
                "type": Array [
                  "index-pattern",
                  "search",
                ],
              },
              undefined,
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

    test('exclude export details if option is specified', async () => {
      savedObjectsClient.find.mockResolvedValueOnce({
        total: 2,
        saved_objects: [
          {
            id: '2',
            type: 'search',
            attributes: {},
            score: 1,
            references: [
              {
                name: 'name',
                type: 'index-pattern',
                id: '1',
              },
            ],
          },
          {
            id: '1',
            type: 'index-pattern',
            attributes: {},
            score: 1,
            references: [],
          },
        ],
        per_page: 1,
        page: 0,
      });
      const exportStream = await exporter.exportByTypes({
        request,
        types: ['index-pattern', 'search'],
        excludeExportDetails: true,
      });

      const response = await readStreamToCompletion(exportStream);

      expect(response).toMatchInlineSnapshot(`
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
                      "name": "name",
                      "type": "index-pattern",
                    },
                  ],
                  "type": "search",
                },
              ]
          `);
    });

    test('exports selected types with search string when present', async () => {
      savedObjectsClient.find.mockResolvedValueOnce({
        total: 2,
        saved_objects: [
          {
            id: '2',
            type: 'search',
            attributes: {},
            score: 1,
            references: [
              {
                name: 'name',
                type: 'index-pattern',
                id: '1',
              },
            ],
          },
          {
            id: '1',
            type: 'index-pattern',
            attributes: {},
            score: 1,
            references: [],
          },
        ],
        per_page: 1,
        page: 0,
      });
      const exportStream = await exporter.exportByTypes({
        request,
        types: ['index-pattern', 'search'],
        search: 'foo',
      });

      const response = await readStreamToCompletion(exportStream);

      expect(response).toMatchInlineSnapshot(`
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
                "name": "name",
                "type": "index-pattern",
              },
            ],
            "type": "search",
          },
          Object {
            "excludedObjects": Array [],
            "excludedObjectsCount": 0,
            "exportedCount": 2,
            "missingRefCount": 0,
            "missingReferences": Array [],
          },
        ]
      `);
      expect(savedObjectsClient.find).toMatchInlineSnapshot(`
        [MockFunction] {
          "calls": Array [
            Array [
              Object {
                "hasReference": undefined,
                "hasReferenceOperator": undefined,
                "namespaces": undefined,
                "perPage": 1000,
                "pit": Object {
                  "id": "some_pit_id",
                  "keepAlive": "2m",
                },
                "search": "foo",
                "searchAfter": undefined,
                "sortField": "updated_at",
                "sortOrder": "desc",
                "type": Array [
                  "index-pattern",
                  "search",
                ],
              },
              undefined,
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

    test('exports selected types with references when present', async () => {
      savedObjectsClient.find.mockResolvedValueOnce({
        total: 1,
        saved_objects: [
          {
            id: '2',
            type: 'search',
            attributes: {},
            score: 1,
            references: [
              {
                name: 'name',
                type: 'index-pattern',
                id: '1',
              },
            ],
          },
        ],
        per_page: 1,
        page: 0,
      });
      const exportStream = await exporter.exportByTypes({
        request,
        types: ['index-pattern', 'search'],
        hasReference: [
          {
            id: '1',
            type: 'index-pattern',
          },
        ],
      });

      const response = await readStreamToCompletion(exportStream);

      expect(response).toMatchInlineSnapshot(`
        Array [
          Object {
            "attributes": Object {},
            "id": "2",
            "references": Array [
              Object {
                "id": "1",
                "name": "name",
                "type": "index-pattern",
              },
            ],
            "type": "search",
          },
          Object {
            "excludedObjects": Array [],
            "excludedObjectsCount": 0,
            "exportedCount": 1,
            "missingRefCount": 0,
            "missingReferences": Array [],
          },
        ]
      `);
      expect(savedObjectsClient.find).toMatchInlineSnapshot(`
        [MockFunction] {
          "calls": Array [
            Array [
              Object {
                "hasReference": Array [
                  Object {
                    "id": "1",
                    "type": "index-pattern",
                  },
                ],
                "hasReferenceOperator": "OR",
                "namespaces": undefined,
                "perPage": 1000,
                "pit": Object {
                  "id": "some_pit_id",
                  "keepAlive": "2m",
                },
                "search": undefined,
                "searchAfter": undefined,
                "sortField": "updated_at",
                "sortOrder": "desc",
                "type": Array [
                  "index-pattern",
                  "search",
                ],
              },
              undefined,
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

    test('exports from the provided namespace when present', async () => {
      savedObjectsClient.find.mockResolvedValueOnce({
        total: 2,
        saved_objects: [
          {
            id: '2',
            type: 'search',
            attributes: {},
            score: 1,
            references: [
              {
                name: 'name',
                type: 'index-pattern',
                id: '1',
              },
            ],
          },
          {
            id: '1',
            type: 'index-pattern',
            attributes: {},
            score: 1,
            references: [],
          },
        ],
        per_page: 1000,
        page: 0,
      });
      const exportStream = await exporter.exportByTypes({
        request,
        types: ['index-pattern', 'search'],
        namespace: 'foo',
      });

      const response = await readStreamToCompletion(exportStream);

      expect(response).toMatchInlineSnapshot(`
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
                "name": "name",
                "type": "index-pattern",
              },
            ],
            "type": "search",
          },
          Object {
            "excludedObjects": Array [],
            "excludedObjectsCount": 0,
            "exportedCount": 2,
            "missingRefCount": 0,
            "missingReferences": Array [],
          },
        ]
      `);
      expect(savedObjectsClient.find).toMatchInlineSnapshot(`
        [MockFunction] {
          "calls": Array [
            Array [
              Object {
                "hasReference": undefined,
                "hasReferenceOperator": undefined,
                "namespaces": Array [
                  "foo",
                ],
                "perPage": 1000,
                "pit": Object {
                  "id": "some_pit_id",
                  "keepAlive": "2m",
                },
                "search": undefined,
                "searchAfter": undefined,
                "sortField": "updated_at",
                "sortOrder": "desc",
                "type": Array [
                  "index-pattern",
                  "search",
                ],
              },
              undefined,
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

    test('export selected types throws error when exceeding exportSizeLimit', async () => {
      exporter = new SavedObjectsExporter({
        exportSizeLimit: 1,
        logger,
        savedObjectsClient,
        typeRegistry,
      });

      savedObjectsClient.openPointInTimeForType.mockResolvedValueOnce({
        id: 'abc123',
      });

      savedObjectsClient.closePointInTime.mockResolvedValueOnce({
        succeeded: true,
        num_freed: 1,
      });

      savedObjectsClient.find.mockResolvedValueOnce({
        total: 2,
        saved_objects: [
          {
            id: '2',
            type: 'search',
            attributes: {},
            score: 1,
            references: [
              {
                type: 'index-pattern',
                name: 'name',
                id: '1',
              },
            ],
          },
          {
            id: '1',
            type: 'index-pattern',
            attributes: {},
            score: 1,
            references: [],
          },
        ],
        per_page: 1,
        page: 0,
        pit_id: 'abc123',
      });
      await expect(
        exporter.exportByTypes({
          request,
          types: ['index-pattern', 'search'],
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Can't export more than 1 objects. If your server has enough memory, this limit can be increased by adjusting the \\"savedObjects.maxImportExportSize\\" setting."`
      );
      expect(savedObjectsClient.closePointInTime).toHaveBeenCalledTimes(1);
    });

    test('sorts objects within type', async () => {
      savedObjectsClient.find.mockResolvedValueOnce({
        total: 3,
        per_page: 1000,
        page: 1,
        saved_objects: [
          {
            id: '3',
            type: 'index-pattern',
            attributes: {
              name: 'baz',
            },
            score: 1,
            references: [],
          },
          {
            id: '1',
            type: 'index-pattern',
            attributes: {
              name: 'foo',
            },
            score: 1,
            references: [],
          },
          {
            id: '2',
            type: 'index-pattern',
            attributes: {
              name: 'bar',
            },
            score: 1,
            references: [],
          },
        ],
      });
      const exportStream = await exporter.exportByTypes({
        request,
        types: ['index-pattern'],
      });
      const response = await readStreamToCompletion(exportStream);
      expect(response).toMatchInlineSnapshot(`
        Array [
          Object {
            "attributes": Object {
              "name": "foo",
            },
            "id": "1",
            "references": Array [],
            "type": "index-pattern",
          },
          Object {
            "attributes": Object {
              "name": "bar",
            },
            "id": "2",
            "references": Array [],
            "type": "index-pattern",
          },
          Object {
            "attributes": Object {
              "name": "baz",
            },
            "id": "3",
            "references": Array [],
            "type": "index-pattern",
          },
          Object {
            "excludedObjects": Array [],
            "excludedObjectsCount": 0,
            "exportedCount": 3,
            "missingRefCount": 0,
            "missingReferences": Array [],
          },
        ]
      `);
    });

    test(`supports the "all types" wildcard`, async () => {
      typeRegistry.registerType(
        createType({
          name: 'exportable_1',
          management: { importableAndExportable: true },
        })
      );
      typeRegistry.registerType(
        createType({
          name: 'exportable_2',
          management: { importableAndExportable: true },
        })
      );
      typeRegistry.registerType(
        createType({
          name: 'not_exportable',
          management: { importableAndExportable: false },
        })
      );

      exporter = createExporter();

      savedObjectsClient.find.mockResolvedValueOnce({
        total: 0,
        per_page: 1000,
        page: 1,
        saved_objects: [],
      });

      await exporter.exportByTypes({ request, types: [EXPORT_ALL_TYPES_TOKEN] });

      expect(savedObjectsClient.createPointInTimeFinder).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.createPointInTimeFinder).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ['exportable_1', 'exportable_2'],
        })
      );
    });
  });

  describe('#exportByObjects', () => {
    test('exports selected objects and sorts them', async () => {
      savedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: '2',
            type: 'search',
            attributes: {},
            references: [
              {
                id: '1',
                name: 'name',
                type: 'index-pattern',
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
      const exportStream = await exporter.exportByObjects({
        request,
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
      const response = await readStreamToCompletion(exportStream);
      expect(response).toMatchInlineSnapshot(`
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
                "name": "name",
                "type": "index-pattern",
              },
            ],
            "type": "search",
          },
          Object {
            "excludedObjects": Array [],
            "excludedObjectsCount": 0,
            "exportedCount": 2,
            "missingRefCount": 0,
            "missingReferences": Array [],
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
                    Object {
                      "id": "2",
                      "type": "search",
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

    test('throws when `bulkGet` returns any errored object', async () => {
      savedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: '1',
            type: 'search',
            attributes: {},
            references: [],
          },
          {
            id: '2',
            type: 'index-pattern',
            error: {
              error: 'NotFound',
              message: 'NotFound',
              statusCode: 404,
            },
            attributes: {},
            references: [],
          },
        ],
      });
      await expect(
        exporter.exportByObjects({
          request,
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
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Error fetching objects to export"`);
    });

    test('export selected objects throws error when exceeding exportSizeLimit', async () => {
      exporter = new SavedObjectsExporter({
        exportSizeLimit: 1,
        logger,
        savedObjectsClient,
        typeRegistry,
      });

      const exportOpts = {
        request,
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
      };
      await expect(exporter.exportByObjects(exportOpts)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Can't export more than 1 objects. If your server has enough memory, this limit can be increased by adjusting the \\"savedObjects.maxImportExportSize\\" setting."`
      );
    });

    test('modifies return results to redact `namespaces` attribute', async () => {
      const createSavedObject = (obj: any) => ({ ...obj, attributes: {}, references: [] });
      savedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          createSavedObject({ type: 'multi', id: '1', namespaces: ['foo'] }),
          createSavedObject({ type: 'multi', id: '2', namespaces: ['bar'] }),
          createSavedObject({ type: 'other', id: '3' }),
        ],
      });
      const exportStream = await exporter.exportByObjects({
        request,
        objects: [
          { type: 'multi', id: '1' },
          { type: 'multi', id: '2' },
          { type: 'other', id: '3' },
        ],
      });
      const response = await readStreamToCompletion(exportStream);
      expect(response).toEqual([
        createSavedObject({ type: 'multi', id: '1' }),
        createSavedObject({ type: 'multi', id: '2' }),
        createSavedObject({ type: 'other', id: '3' }),
        expect.objectContaining({ exportedCount: 3 }),
      ]);
    });

    test('return results including the `namespaces` attribute when includeNamespaces option is used', async () => {
      const createSavedObject = (obj: any) => ({ ...obj, attributes: {}, references: [] });
      const objectResults = [
        createSavedObject({ type: 'multi', id: '1', namespaces: ['foo'] }),
        createSavedObject({ type: 'multi', id: '2', namespaces: ['bar'] }),
        createSavedObject({ type: 'other', id: '3' }),
      ];
      savedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: objectResults,
      });
      const exportStream = await exporter.exportByObjects({
        request,
        objects: [
          { type: 'multi', id: '1' },
          { type: 'multi', id: '2' },
          { type: 'other', id: '3' },
        ],
        includeNamespaces: true,
      });
      const response = await readStreamToCompletion(exportStream);
      expect(response).toEqual([...objectResults, expect.objectContaining({ exportedCount: 3 })]);
    });

    test('includes nested dependencies when passed in', async () => {
      savedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: '2',
            type: 'search',
            attributes: {},
            references: [
              {
                type: 'index-pattern',
                name: 'name',
                id: '1',
              },
            ],
          },
        ],
      });
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
      const exportStream = await exporter.exportByObjects({
        request,
        objects: [
          {
            type: 'search',
            id: '2',
          },
        ],
        includeReferencesDeep: true,
      });
      const response = await readStreamToCompletion(exportStream);
      expect(response).toMatchInlineSnapshot(`
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
                "name": "name",
                "type": "index-pattern",
              },
            ],
            "type": "search",
          },
          Object {
            "excludedObjects": Array [],
            "excludedObjectsCount": 0,
            "exportedCount": 2,
            "missingRefCount": 0,
            "missingReferences": Array [],
          },
        ]
      `);
      expect(savedObjectsClient.bulkGet).toMatchInlineSnapshot(`
            [MockFunction] {
              "calls": Array [
                Array [
                  Array [
                    Object {
                      "id": "2",
                      "type": "search",
                    },
                  ],
                  Object {
                    "namespace": undefined,
                  },
                ],
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
                Object {
                  "type": "return",
                  "value": Promise {},
                },
              ],
            }
        `);
    });
  });
});
