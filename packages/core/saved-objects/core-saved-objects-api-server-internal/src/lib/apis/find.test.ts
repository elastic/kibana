/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  pointInTimeFinderMock,
  mockGetCurrentTime,
  mockGetSearchDsl,
} from '../repository.test.mock';

import type { SavedObjectsFindOptions } from '@kbn/core-saved-objects-api-server';

import { SavedObjectsRepository } from '../repository';
import { loggerMock } from '@kbn/logging-mocks';
import { SavedObjectsSerializer } from '@kbn/core-saved-objects-base-server-internal';
import { kibanaMigratorMock } from '../../mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import * as esKuery from '@kbn/es-query';

import {
  NAMESPACE_AGNOSTIC_TYPE,
  HIDDEN_TYPE,
  mockTimestampFields,
  mockTimestamp,
  mappings,
  mockVersion,
  createRegistry,
  createDocumentMigrator,
  createSpySerializer,
  generateIndexPatternSearchResults,
  findSuccess,
} from '../../test_helpers/repository.test.common';

const { nodeTypes } = esKuery;

describe('find', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let repository: SavedObjectsRepository;
  let migrator: ReturnType<typeof kibanaMigratorMock.create>;
  let logger: ReturnType<typeof loggerMock.create>;
  let serializer: jest.Mocked<SavedObjectsSerializer>;

  const registry = createRegistry();
  const documentMigrator = createDocumentMigrator(registry);

  const expectMigrationArgs = (args: unknown, contains = true, n = 1) => {
    const obj = contains ? expect.objectContaining(args) : expect.not.objectContaining(args);
    expect(migrator.migrateDocument).toHaveBeenNthCalledWith(
      n,
      obj,
      expect.objectContaining({
        allowDowngrade: expect.any(Boolean),
      })
    );
  };

  beforeEach(() => {
    pointInTimeFinderMock.mockClear();
    client = elasticsearchClientMock.createElasticsearchClient();
    migrator = kibanaMigratorMock.create();
    documentMigrator.prepareMigrations();
    migrator.migrateDocument = jest.fn().mockImplementation(documentMigrator.migrate);
    migrator.runMigrations = jest.fn().mockResolvedValue([{ status: 'skipped' }]);
    logger = loggerMock.create();

    // create a mock serializer "shim" so we can track function calls, but use the real serializer's implementation
    serializer = createSpySerializer(registry);

    const allTypes = registry.getAllTypes().map((type) => type.name);
    const allowedTypes = [...new Set(allTypes.filter((type) => !registry.isHidden(type)))];

    // @ts-expect-error must use the private constructor to use the mocked serializer
    repository = new SavedObjectsRepository({
      index: '.kibana-test',
      mappings,
      client,
      migrator,
      typeRegistry: registry,
      serializer,
      allowedTypes,
      logger,
    });

    mockGetCurrentTime.mockReturnValue(mockTimestamp);
    mockGetSearchDsl.mockClear();
  });

  describe('performFind', () => {
    const type = 'index-pattern';
    const namespace = 'foo-namespace';

    describe('client calls', () => {
      it(`should use the ES search action`, async () => {
        await findSuccess(client, repository, { type });
        expect(client.search).toHaveBeenCalledTimes(1);
      });

      it(`merges output of getSearchDsl into es request body`, async () => {
        const query = { query: 1, aggregations: 2 };
        mockGetSearchDsl.mockReturnValue(query);
        await findSuccess(client, repository, { type });

        expect(client.search).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.objectContaining({ ...query }),
          }),
          expect.anything()
        );
      });

      it(`accepts per_page/page`, async () => {
        await findSuccess(client, repository, { type, perPage: 10, page: 6 });
        expect(client.search).toHaveBeenCalledWith(
          expect.objectContaining({
            size: 10,
            from: 50,
          }),
          expect.anything()
        );
      });

      it(`accepts preference`, async () => {
        await findSuccess(client, repository, { type, preference: 'pref' });
        expect(client.search).toHaveBeenCalledWith(
          expect.objectContaining({
            preference: 'pref',
          }),
          expect.anything()
        );
      });

      it(`can filter by fields`, async () => {
        await findSuccess(client, repository, { type, fields: ['title'] });
        expect(client.search).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.objectContaining({
              _source: [
                `${type}.title`,
                'namespace',
                'namespaces',
                'type',
                'references',
                'migrationVersion',
                'coreMigrationVersion',
                'typeMigrationVersion',
                'managed',
                'updated_at',
                'updated_by',
                'created_at',
                'created_by',
                'originId',
              ],
            }),
          }),
          expect.anything()
        );
      });

      it(`should set rest_total_hits_as_int to true on a request`, async () => {
        await findSuccess(client, repository, { type });
        expect(client.search).toHaveBeenCalledWith(
          expect.objectContaining({
            rest_total_hits_as_int: true,
          }),
          expect.anything()
        );
      });

      it(`should not make a client call when attempting to find only invalid or hidden types`, async () => {
        const test = async (types: string | string[]) => {
          await repository.find({ type: types });
          expect(client.search).not.toHaveBeenCalled();
        };

        await test('unknownType');
        await test(HIDDEN_TYPE);
        await test(['unknownType', HIDDEN_TYPE]);
      });
    });

    describe('errors', () => {
      it(`throws when type is not defined`, async () => {
        // @ts-expect-error type should be defined
        await expect(repository.find({})).rejects.toThrowError(
          'options.type must be a string or an array of strings'
        );
        expect(client.search).not.toHaveBeenCalled();
      });

      it(`throws when namespaces is an empty array`, async () => {
        await expect(repository.find({ type: 'foo', namespaces: [] })).rejects.toThrowError(
          'options.namespaces cannot be an empty array'
        );
        expect(client.search).not.toHaveBeenCalled();
      });

      it(`throws when searchFields is defined but not an array`, async () => {
        await expect(
          // @ts-expect-error searchFields is an array
          repository.find({ type, searchFields: 'string' })
        ).rejects.toThrowError('options.searchFields must be an array');
        expect(client.search).not.toHaveBeenCalled();
      });

      it(`throws when fields is defined but not an array`, async () => {
        // @ts-expect-error fields is an array
        await expect(repository.find({ type, fields: 'string' })).rejects.toThrowError(
          'options.fields must be an array'
        );
        expect(client.search).not.toHaveBeenCalled();
      });

      it(`throws when a preference is provided with pit`, async () => {
        await expect(
          repository.find({ type: 'foo', pit: { id: 'abc123' }, preference: 'hi' })
        ).rejects.toThrowError('options.preference must be excluded when options.pit is used');
        expect(client.search).not.toHaveBeenCalled();
      });

      it(`throws when KQL filter syntax is invalid`, async () => {
        const findOpts: SavedObjectsFindOptions = {
          namespaces: [namespace],
          search: 'foo*',
          searchFields: ['foo'],
          type: ['dashboard'],
          sortField: 'name',
          sortOrder: 'desc',
          defaultSearchOperator: 'AND',
          hasReference: {
            type: 'foo',
            id: '1',
          },
          filter: 'dashboard.attributes.otherField:<',
        };

        await expect(repository.find(findOpts)).rejects.toMatchInlineSnapshot(`
                          [Error: KQLSyntaxError: Expected "(", "{", value, whitespace but "<" found.
                          dashboard.attributes.otherField:<
                          --------------------------------^: Bad Request]
                      `);
        expect(mockGetSearchDsl).not.toHaveBeenCalled();
        expect(client.search).not.toHaveBeenCalled();
      });
    });

    describe('returns', () => {
      it(`formats the ES response when there is no namespace`, async () => {
        const noNamespaceSearchResults = generateIndexPatternSearchResults();
        client.search.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(noNamespaceSearchResults)
        );
        const count = noNamespaceSearchResults.hits.hits.length;

        const response = await repository.find({ type });

        expect(response.total).toBe(count);
        expect(response.saved_objects).toHaveLength(count);

        noNamespaceSearchResults.hits.hits.forEach((doc, i) => {
          expect(response.saved_objects[i]).toEqual({
            id: doc._id!.replace(/(index-pattern|config|globalType)\:/, ''),
            type: doc._source!.type,
            originId: doc._source!.originId,
            ...mockTimestampFields,
            version: mockVersion,
            score: doc._score,
            sort: doc.sort,
            attributes: doc._source![doc._source!.type],
            references: [],
            namespaces: doc._source!.type === NAMESPACE_AGNOSTIC_TYPE ? undefined : ['default'],
            coreMigrationVersion: expect.any(String),
            typeMigrationVersion: expect.any(String),
            managed: expect.any(Boolean),
          });
        });
      });

      it(`formats the ES response when there is a namespace`, async () => {
        const namespacedSearchResults = generateIndexPatternSearchResults(namespace);
        client.search.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(namespacedSearchResults)
        );
        const count = namespacedSearchResults.hits.hits.length;

        const response = await repository.find({ type, namespaces: [namespace] });

        expect(response.total).toBe(count);
        expect(response.saved_objects).toHaveLength(count);

        namespacedSearchResults.hits.hits.forEach((doc, i) => {
          expect(response.saved_objects[i]).toEqual({
            id: doc._id!.replace(/(foo-namespace\:)?(index-pattern|config|globalType)\:/, ''),
            type: doc._source!.type,
            originId: doc._source!.originId,
            ...mockTimestampFields,
            version: mockVersion,
            score: doc._score,
            sort: doc.sort,
            attributes: doc._source![doc._source!.type],
            references: [],
            namespaces: doc._source!.type === NAMESPACE_AGNOSTIC_TYPE ? undefined : [namespace],
            coreMigrationVersion: expect.any(String),
            typeMigrationVersion: expect.any(String),
            managed: expect.any(Boolean),
          });
        });
      });

      it(`should return empty results when attempting to find only invalid or hidden types`, async () => {
        const test = async (types: string | string[]) => {
          const result = await repository.find({ type: types });
          expect(result).toEqual(expect.objectContaining({ saved_objects: [] }));
          expect(client.search).not.toHaveBeenCalled();
        };

        await test('unknownType');
        await test(HIDDEN_TYPE);
        await test(['unknownType', HIDDEN_TYPE]);
      });

      it('migrates the found document', async () => {
        const noNamespaceSearchResults = generateIndexPatternSearchResults();
        client.search.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(noNamespaceSearchResults)
        );
        migrator.migrateDocument.mockImplementationOnce((doc) => ({ ...doc, migrated: true }));
        await expect(repository.find({ type })).resolves.toHaveProperty(
          'saved_objects.0.migrated',
          true
        );
        expect(migrator.migrateDocument).toHaveBeenCalledTimes(
          noNamespaceSearchResults.hits.hits.length
        );
        expectMigrationArgs({
          type,
          id: noNamespaceSearchResults.hits.hits[0]._id!.replace(
            /(index-pattern|config|globalType)\:/,
            ''
          ),
        });
      });
    });

    describe('search dsl', () => {
      const commonOptions: SavedObjectsFindOptions = {
        type: [type],
        namespaces: [namespace],
        search: 'foo*',
        searchFields: ['foo'],
        sortField: 'name',
        sortOrder: 'desc',
        defaultSearchOperator: 'AND',
        hasReference: {
          type: 'foo',
          id: '1',
        },
        hasNoReference: {
          type: 'bar',
          id: '1',
        },
      };

      it(`passes mappings, registry, and search options to getSearchDsl`, async () => {
        await findSuccess(client, repository, commonOptions, namespace);
        expect(mockGetSearchDsl).toHaveBeenCalledWith(mappings, registry, commonOptions);
      });

      it(`accepts hasReferenceOperator`, async () => {
        const relevantOpts: SavedObjectsFindOptions = {
          ...commonOptions,
          hasReferenceOperator: 'AND',
        };

        await findSuccess(client, repository, relevantOpts, namespace);
        expect(mockGetSearchDsl).toHaveBeenCalledWith(mappings, registry, {
          ...relevantOpts,
          hasReferenceOperator: 'AND',
        });
      });

      it(`accepts searchAfter`, async () => {
        const relevantOpts: SavedObjectsFindOptions = {
          ...commonOptions,
          searchAfter: ['1', 'a'],
        };

        await findSuccess(client, repository, relevantOpts, namespace);
        expect(mockGetSearchDsl).toHaveBeenCalledWith(mappings, registry, {
          ...relevantOpts,
          searchAfter: ['1', 'a'],
        });
      });

      it(`accepts pit`, async () => {
        const relevantOpts: SavedObjectsFindOptions = {
          ...commonOptions,
          pit: { id: 'abc123', keepAlive: '2m' },
        };

        await findSuccess(client, repository, relevantOpts, namespace);
        expect(mockGetSearchDsl).toHaveBeenCalledWith(mappings, registry, {
          ...relevantOpts,
          pit: { id: 'abc123', keepAlive: '2m' },
        });
      });

      it(`accepts KQL expression filter and passes KueryNode to getSearchDsl`, async () => {
        const findOpts: SavedObjectsFindOptions = {
          namespaces: [namespace],
          search: 'foo*',
          searchFields: ['foo'],
          type: ['dashboard'],
          sortField: 'name',
          sortOrder: 'desc',
          defaultSearchOperator: 'AND',
          hasReference: {
            type: 'foo',
            id: '1',
          },
          filter: 'dashboard.attributes.otherField: *',
        };

        await findSuccess(client, repository, findOpts, namespace);
        const { kueryNode } = mockGetSearchDsl.mock.calls[0][2];
        expect(kueryNode).toMatchInlineSnapshot(`
          Object {
            "arguments": Array [
              Object {
                "isQuoted": false,
                "type": "literal",
                "value": "dashboard.otherField",
              },
              Object {
                "type": "wildcard",
                "value": "@kuery-wildcard@",
              },
            ],
            "function": "is",
            "type": "function",
          }
        `);
      });

      it(`accepts KQL KueryNode filter and passes KueryNode to getSearchDsl`, async () => {
        const findOpts: SavedObjectsFindOptions = {
          namespaces: [namespace],
          search: 'foo*',
          searchFields: ['foo'],
          type: ['dashboard'],
          sortField: 'name',
          sortOrder: 'desc',
          defaultSearchOperator: 'AND',
          hasReference: {
            type: 'foo',
            id: '1',
          },
          filter: nodeTypes.function.buildNode('is', `dashboard.attributes.otherField`, '*'),
        };

        await findSuccess(client, repository, findOpts, namespace);
        const { kueryNode } = mockGetSearchDsl.mock.calls[0][2];
        expect(kueryNode).toMatchInlineSnapshot(`
          Object {
            "arguments": Array [
              Object {
                "isQuoted": false,
                "type": "literal",
                "value": "dashboard.otherField",
              },
              Object {
                "type": "wildcard",
                "value": "@kuery-wildcard@",
              },
            ],
            "function": "is",
            "type": "function",
          }
        `);
      });

      it(`supports multiple types`, async () => {
        const types = ['config', 'index-pattern'];
        await findSuccess(client, repository, { type: types });

        expect(mockGetSearchDsl).toHaveBeenCalledWith(
          mappings,
          registry,
          expect.objectContaining({
            type: types,
          })
        );
      });

      it(`filters out invalid types`, async () => {
        const types = ['config', 'unknownType', 'index-pattern'];
        await findSuccess(client, repository, { type: types });

        expect(mockGetSearchDsl).toHaveBeenCalledWith(
          mappings,
          registry,
          expect.objectContaining({
            type: ['config', 'index-pattern'],
          })
        );
      });

      it(`filters out hidden types`, async () => {
        const types = ['config', HIDDEN_TYPE, 'index-pattern'];
        await findSuccess(client, repository, { type: types });

        expect(mockGetSearchDsl).toHaveBeenCalledWith(
          mappings,
          registry,
          expect.objectContaining({
            type: ['config', 'index-pattern'],
          })
        );
      });
    });
  });
});
