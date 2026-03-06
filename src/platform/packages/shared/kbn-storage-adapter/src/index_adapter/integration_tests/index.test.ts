/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createTestServers, type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import type {
  SimpleIStorageClient,
  StorageClientBulkResponse,
  StorageClientIndexResponse,
  StorageDocumentOf,
} from '../../..';
import {
  BulkOperationError,
  StorageIndexAdapter,
  defineVersioning,
  types,
  type StorageSettings,
} from '../../..';
import { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/core/server';
import * as getSchemaVersionModule from '../../get_schema_version';
import { isResponseError } from '@kbn/es-errors';
import type { IndicesGetResponse } from '@elastic/elasticsearch/lib/api/types';
import type { SimpleStorageIndexAdapter, StorageIndexAdapterOptions } from '..';
import type { Client } from '@elastic/elasticsearch';
import { VERSION_FIELD } from '../../schema_versioning';

const TEST_INDEX_NAME = 'test_index';

const createLoggerMock = (): jest.Mocked<Logger> => {
  const logger = {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    get: jest.fn(),
  } as unknown as jest.Mocked<Logger>;

  logger.get.mockReturnValue(logger);

  return logger;
};

describe('StorageIndexAdapter', () => {
  let esServer: TestElasticsearchUtils;
  let esClient: Client;

  let loggerMock: jest.Mocked<Logger>;

  const storageSettings = {
    name: TEST_INDEX_NAME,
    schema: {
      properties: {
        foo: {
          type: 'keyword',
        },
      },
    },
  } satisfies StorageSettings;

  let adapter: SimpleStorageIndexAdapter<typeof storageSettings>;
  let client: SimpleIStorageClient<typeof storageSettings>;
  beforeAll(async () => {
    await createServers();
  });

  afterAll(async () => {
    await stopServers();
  });

  describe('with a clean Elasticsearch instance', () => {
    afterAll(async () => {
      await client?.clean();
    });
    it('creates a named logger', () => {
      expect(loggerMock.get).toHaveBeenCalledWith('storage');
      expect(loggerMock.get).toHaveBeenCalledWith('test_index');
    });

    it('does not install index templates or backing indices initially', async () => {
      await verifyNoIndexTemplate();
      await verifyNoIndex();
    });

    describe('after searching', () => {
      beforeAll(async () => {
        await client
          .search({ track_total_hits: false, size: 1, query: { match_all: {} } })
          .catch((error) => {});
      });

      it('does not install index templates or backing indices', async () => {
        await verifyNoIndexTemplate();
        await verifyNoIndex();
      });

      it('does not fail a search when an index does not exist', async () => {
        expect(
          await client.search({
            track_total_hits: true,
            size: 1,
            query: { match_all: {} },
          })
        ).toMatchObject({
          hits: {
            hits: [],
            total: {
              value: 0,
              relation: 'eq',
            },
          },
        });
      });
    });
  });

  describe('when indexing into a clean Elasticsearch instance', () => {
    afterAll(async () => {
      await client?.clean();
    });
    let indexResponse: StorageClientIndexResponse;

    beforeAll(async () => {
      indexResponse = await client.index({
        id: 'doc1',
        document: { foo: 'bar' },
      });
    });

    it('creates the resources', async () => {
      await verifyIndex();
    });

    it('returns the indexed document', async () => {
      expect(indexResponse).toMatchObject({
        _id: 'doc1',
        _shards: {
          successful: 1,
        },
        _version: 1,
        result: 'created',
      });
    });

    it('returns the document when searching', async () => {
      const searchResponse = await client.search({
        track_total_hits: true,
        size: 1,
        query: {
          bool: {
            filter: [
              {
                term: {
                  foo: 'bar',
                },
              },
            ],
          },
        },
      });

      expect(searchResponse).toMatchObject({
        hits: {
          total: {
            value: 1,
            relation: 'eq',
          },
          hits: [
            {
              _id: 'doc1',
              _source: {
                foo: 'bar',
              },
            },
          ],
        },
      });
    });

    it('deletes the document', async () => {
      await verifyClean();
    });
  });

  describe('when bulk indexing into a clean Elasticsearch instance', () => {
    afterAll(async () => {
      await client?.clean();
    });
    let bulkIndexResponse: StorageClientBulkResponse;

    beforeAll(async () => {
      bulkIndexResponse = await client.bulk({
        operations: [
          {
            index: {
              _id: 'doc1',
              document: { foo: 'bar' },
            },
          },
        ],
      });
    });

    it('creates the resources', async () => {
      await verifyIndex();
    });

    it('returns the indexed document', async () => {
      expect(bulkIndexResponse).toMatchObject({
        errors: false,
        items: [
          {
            index: {
              _id: 'doc1',
              _shards: {
                successful: 1,
              },
              result: 'created',
              status: 201,
            },
          },
        ],
      });
    });

    it('returns the document when searching', async () => {
      const searchResponse = await client.search({
        track_total_hits: true,
        size: 1,
        query: {
          bool: {
            filter: [
              {
                term: {
                  foo: 'bar',
                },
              },
            ],
          },
        },
      });

      expect(searchResponse).toMatchObject({
        hits: {
          total: {
            value: 1,
            relation: 'eq',
          },
          hits: [
            {
              _id: 'doc1',
              _source: {
                foo: 'bar',
              },
            },
          ],
        },
      });
    });

    describe('migrates a document with a legacy property', () => {
      let migratingClient: SimpleIStorageClient<typeof storageSettings>;
      beforeAll(async () => {
        adapter = createStorageIndexAdapter(storageSettings, {
          migrateSource: (source) => {
            return {
              ...source,
              migratedProp: String(source.foo).toUpperCase(),
            } as StorageDocumentOf<typeof storageSettings>;
          },
        });
        migratingClient = adapter.getClient();
        await client.bulk({
          operations: [
            {
              index: {
                _id: 'otherdoc',
                document: { foo: 'xyz' } as StorageDocumentOf<typeof storageSettings>,
              },
            },
          ],
        });
      });

      afterAll(async () => {
        await client.clean();
      });

      it('returns the migrated document on get', async () => {
        const getResponse = await migratingClient.get({ id: 'otherdoc' });
        expect(getResponse._source).toMatchObject({
          foo: 'xyz',
          migratedProp: 'XYZ',
        });
      });

      it('returns the migrated document on search', async () => {
        const searchResponse = await migratingClient.search({
          track_total_hits: true,
          size: 1,
          query: {
            bool: {
              filter: [
                {
                  term: {
                    foo: 'xyz',
                  },
                },
              ],
            },
          },
        });

        expect(searchResponse.hits.hits[0]._source).toMatchObject({
          migratedProp: 'XYZ',
          foo: 'xyz',
        });
      });
    });
  });

  describe('when writing/bootstrapping with an legacy index', () => {
    beforeAll(async () => {
      await client.index({ id: 'foo', document: { foo: 'bar' } });

      jest.spyOn(getSchemaVersionModule, 'getSchemaVersion').mockReturnValue('next_version');

      await client.index({ id: 'foo', document: { foo: 'bar' } });
    });

    afterAll(async () => {
      await client?.clean();
    });
    it('updates the existing write index in place', async () => {
      await verifyIndex({ version: 'next_version' });

      const getIndicesResponse = await esClient.indices.get({
        index: TEST_INDEX_NAME,
      });

      const indices = Object.keys(getIndicesResponse);

      const writeIndexName = `${TEST_INDEX_NAME}-000001`;

      expect(indices).toEqual([writeIndexName]);

      expect(getIndicesResponse[writeIndexName].mappings?._meta?.version).toEqual('next_version');
    });

    it('deletes the documents', async () => {
      await verifyClean();
    });
  });

  describe('when bulk operation encounters errors', () => {
    afterAll(async () => {
      await client?.clean();
    });

    it('throws BulkOperationError when bulk operation contains document-level errors', async () => {
      // Create an adapter with strict mapping to trigger mapping errors
      const strictAdapter = createStorageIndexAdapter({
        name: 'test_strict_index',
        schema: {
          properties: {
            foo: {
              type: 'keyword',
            },
          },
        },
      });
      const strictClient = strictAdapter.getClient();

      // First create the index with strict mapping
      await strictClient.index({
        id: 'doc1',
        document: { foo: 'bar' },
      });

      // Try to bulk index with an invalid field (should fail due to dynamic: strict)
      await expect(
        strictClient.bulk({
          operations: [
            {
              index: {
                _id: 'doc2',
                document: { foo: 'baz', invalid_field: 'value' } as any,
              },
            },
          ],
          refresh: 'wait_for',
          throwOnFail: true,
        })
      ).rejects.toThrow(BulkOperationError);

      await strictClient.clean();
    });

    it('includes error details in the thrown BulkOperationError', async () => {
      const strictAdapter = createStorageIndexAdapter({
        name: 'test_strict_index_2',
        schema: {
          properties: {
            foo: {
              type: 'keyword',
            },
          },
        },
      });
      const strictClient = strictAdapter.getClient();

      // Create the index
      await strictClient.index({
        id: 'doc1',
        document: { foo: 'bar' },
      });

      try {
        await strictClient.bulk({
          operations: [
            {
              index: {
                _id: 'doc2',
                document: { foo: 'baz', invalid_field: 'value' } as any,
              },
            },
          ],
          throwOnFail: true,
          refresh: 'wait_for',
        });
        fail('Expected BulkOperationError to be thrown');
      } catch (err) {
        const error = err as BulkOperationError;
        expect(error).toBeInstanceOf(BulkOperationError);
        expect(error.message).toContain('Bulk operation failed');
        expect(error.message).toContain('1 out of 1 items');
        expect(error.response).toBeDefined();
        expect(error.response.errors).toBe(true);
        expect(error.response.items).toHaveLength(1);
        expect(error.response.items[0].index?.error).toBeDefined();
        expect(error.response.items[0].index?.error?.type).toBe('strict_dynamic_mapping_exception');
      }

      await strictClient.clean();
    });
  });

  describe('when writing/bootstrapping with an existing, incompatible index', () => {
    beforeAll(async () => {
      await client.index({ id: 'foo', document: { foo: 'bar' } });

      jest
        .spyOn(getSchemaVersionModule, 'getSchemaVersion')
        .mockReturnValue('incompatible_version');
    });

    afterAll(async () => {
      await client?.clean();
    });

    it('fails when indexing', async () => {
      const incompatibleAdapter = createStorageIndexAdapter({
        ...storageSettings,
        schema: {
          properties: {
            foo: {
              type: 'text',
            },
          },
        },
      });

      await expect(
        async () =>
          await incompatibleAdapter.getClient().index({ id: 'foo', document: { foo: 'bar' } })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`
        "illegal_argument_exception
        	Root causes:
        		illegal_argument_exception: mapper [foo] cannot be changed from type [keyword] to [text]"
      `);
    });

    it('deletes the documents', async () => {
      await verifyClean();
    });
  });

  describe('with schema versioning', () => {
    const VERSIONED_INDEX = 'test_versioned';

    const versionedStorageSettings = {
      name: VERSIONED_INDEX,
      schema: {
        properties: {
          name: types.keyword(),
          score: types.long(),
          active: types.boolean(),
        },
      },
    } satisfies StorageSettings;

    interface VersionedDoc {
      name: string;
      score?: number;
      active?: boolean;
    }

    const v1Schema = z.object({ name: z.string() });
    const v2Schema = z.object({ name: z.string(), score: z.number() });
    const v3Schema = z.object({ name: z.string(), score: z.number(), active: z.boolean() });

    afterEach(async () => {
      const cleanAdapter = new StorageIndexAdapter(esClient, loggerMock, versionedStorageSettings);
      await cleanAdapter.getClient().clean();
    });

    describe('writing and reading versioned documents', () => {
      it('stamps __version on write and strips it on read', async () => {
        const versioning = defineVersioning(v1Schema).build();

        const versionedAdapter = new StorageIndexAdapter<
          typeof versionedStorageSettings,
          VersionedDoc
        >(esClient, loggerMock, versionedStorageSettings, { versioning });
        const versionedClient = versionedAdapter.getClient();

        await versionedClient.index({ id: 'doc1', document: { name: 'test' } });

        const rawDoc = await esClient.search({
          index: VERSIONED_INDEX,
          query: { term: { _id: 'doc1' } },
        });
        const rawSource = rawDoc.hits.hits[0]._source as Record<string, unknown>;
        expect(rawSource[VERSION_FIELD]).toBe(1);

        const getResponse = await versionedClient.get({ id: 'doc1' });
        expect(getResponse._source).toEqual({ name: 'test' });
        expect(
          (getResponse._source as unknown as Record<string, unknown>)[VERSION_FIELD]
        ).toBeUndefined();
      });

      it('validates documents against the zod schema on write', async () => {
        const versioning = defineVersioning(v1Schema).build();

        const versionedAdapter = new StorageIndexAdapter<
          typeof versionedStorageSettings,
          VersionedDoc
        >(esClient, loggerMock, versionedStorageSettings, { versioning });
        const versionedClient = versionedAdapter.getClient();

        await expect(
          versionedClient.index({ id: 'bad', document: { wrong: 'shape' } as any })
        ).rejects.toThrow();
      });

      it('includes __version in ES mapping when versioning is configured', async () => {
        const versioning = defineVersioning(v1Schema).build();

        const versionedAdapter = new StorageIndexAdapter<
          typeof versionedStorageSettings,
          VersionedDoc
        >(esClient, loggerMock, versionedStorageSettings, { versioning });
        const versionedClient = versionedAdapter.getClient();

        await versionedClient.index({ id: 'doc1', document: { name: 'test' } });

        const indexResponse = await esClient.indices.get({ index: VERSIONED_INDEX });
        const writeIndex = Object.keys(indexResponse)[0];
        const properties = indexResponse[writeIndex].mappings?.properties;

        expect(properties).toHaveProperty(VERSION_FIELD);
        expect(properties![VERSION_FIELD]).toEqual({ type: 'long' });
      });
    });

    describe('multi-version migration on read', () => {
      it('migrates a v1 document to v3 through all steps', async () => {
        const v1Versioning = defineVersioning(v1Schema).build();
        const v1Adapter = new StorageIndexAdapter<typeof versionedStorageSettings, VersionedDoc>(
          esClient,
          loggerMock,
          versionedStorageSettings,
          { versioning: v1Versioning }
        );
        await v1Adapter.getClient().index({ id: 'doc1', document: { name: 'alice' } });

        const v3Versioning = defineVersioning(v1Schema)
          .addVersion({ schema: v2Schema, migrate: (prev) => ({ ...prev, score: 0 }) })
          .addVersion({ schema: v3Schema, migrate: (prev) => ({ ...prev, active: true }) })
          .build();
        const v3Adapter = new StorageIndexAdapter<typeof versionedStorageSettings, VersionedDoc>(
          esClient,
          loggerMock,
          versionedStorageSettings,
          { versioning: v3Versioning }
        );
        const v3Client = v3Adapter.getClient();

        const getResponse = await v3Client.get({ id: 'doc1' });
        expect(getResponse._source).toEqual({ name: 'alice', score: 0, active: true });

        const searchResponse = await v3Client.search({
          track_total_hits: true,
          size: 10,
          query: { match_all: {} },
        });
        expect(searchResponse.hits.hits[0]._source).toEqual({
          name: 'alice',
          score: 0,
          active: true,
        });
      });

      it('migrates a v2 document to v3', async () => {
        const v2Versioning = defineVersioning(v1Schema)
          .addVersion({ schema: v2Schema, migrate: (prev) => ({ ...prev, score: 0 }) })
          .build();
        const v2Adapter = new StorageIndexAdapter<typeof versionedStorageSettings, VersionedDoc>(
          esClient,
          loggerMock,
          versionedStorageSettings,
          { versioning: v2Versioning }
        );
        await v2Adapter.getClient().index({ id: 'doc1', document: { name: 'bob', score: 99 } });

        const v3Versioning = defineVersioning(v1Schema)
          .addVersion({ schema: v2Schema, migrate: (prev) => ({ ...prev, score: 0 }) })
          .addVersion({ schema: v3Schema, migrate: (prev) => ({ ...prev, active: true }) })
          .build();
        const v3Adapter = new StorageIndexAdapter<typeof versionedStorageSettings, VersionedDoc>(
          esClient,
          loggerMock,
          versionedStorageSettings,
          { versioning: v3Versioning }
        );

        const getResponse = await v3Adapter.getClient().get({ id: 'doc1' });
        expect(getResponse._source).toEqual({ name: 'bob', score: 99, active: true });
      });
    });

    describe('legacy document compatibility', () => {
      it('uses migrateSource for documents without __version, then validates against latest schema', async () => {
        const plainAdapter = new StorageIndexAdapter(
          esClient,
          loggerMock,
          versionedStorageSettings
        );
        await plainAdapter.getClient().index({ id: 'legacy1', document: { name: 'old' } });

        const versioning = defineVersioning(v2Schema).build();
        const versionedAdapter = new StorageIndexAdapter<
          typeof versionedStorageSettings,
          VersionedDoc
        >(esClient, loggerMock, versionedStorageSettings, {
          versioning,
          migrateSource: (doc) => ({ ...doc, score: -1 } as VersionedDoc),
        });

        const getResponse = await versionedAdapter.getClient().get({ id: 'legacy1' });
        expect(getResponse._source).toEqual({ name: 'old', score: -1 });
      });

      it('treats documents without __version as v1 when no migrateSource is provided', async () => {
        const plainAdapter = new StorageIndexAdapter(
          esClient,
          loggerMock,
          versionedStorageSettings
        );
        await plainAdapter.getClient().index({ id: 'legacy2', document: { name: 'old' } });

        const versioning = defineVersioning(v1Schema)
          .addVersion({ schema: v2Schema, migrate: (prev) => ({ ...prev, score: 0 }) })
          .build();
        const versionedAdapter = new StorageIndexAdapter<
          typeof versionedStorageSettings,
          VersionedDoc
        >(esClient, loggerMock, versionedStorageSettings, { versioning });

        const getResponse = await versionedAdapter.getClient().get({ id: 'legacy2' });
        expect(getResponse._source).toEqual({ name: 'old', score: 0 });
      });
    });

    describe('migrateDocuments', () => {
      it('migrates outdated documents in bulk', async () => {
        const v1Versioning = defineVersioning(v1Schema).build();
        const v1Adapter = new StorageIndexAdapter<typeof versionedStorageSettings, VersionedDoc>(
          esClient,
          loggerMock,
          versionedStorageSettings,
          { versioning: v1Versioning }
        );
        const v1Client = v1Adapter.getClient();
        await v1Client.index({ id: 'doc1', document: { name: 'alice' } });
        await v1Client.index({ id: 'doc2', document: { name: 'bob' } });

        const v2Versioning = defineVersioning(v1Schema)
          .addVersion({ schema: v2Schema, migrate: (prev) => ({ ...prev, score: 10 }) })
          .build();
        const v2Adapter = new StorageIndexAdapter<typeof versionedStorageSettings, VersionedDoc>(
          esClient,
          loggerMock,
          versionedStorageSettings,
          { versioning: v2Versioning }
        );
        const v2Client = v2Adapter.getClient();

        const result = await v2Client.migrateDocuments();
        expect(result).toEqual({ migrated: 2, total: 2 });

        const rawDocs = await esClient.search({
          index: VERSIONED_INDEX,
          size: 10,
          query: { match_all: {} },
        });
        for (const hit of rawDocs.hits.hits) {
          const source = hit._source as Record<string, unknown>;
          expect(source[VERSION_FIELD]).toBe(2);
          expect(source.score).toBe(10);
        }
      });

      it('returns zero when no documents need migration', async () => {
        const versioning = defineVersioning(v1Schema).build();
        const versionedAdapter = new StorageIndexAdapter<
          typeof versionedStorageSettings,
          VersionedDoc
        >(esClient, loggerMock, versionedStorageSettings, { versioning });
        const versionedClient = versionedAdapter.getClient();

        await versionedClient.index({ id: 'doc1', document: { name: 'current' } });

        const result = await versionedClient.migrateDocuments();
        expect(result).toEqual({ migrated: 0, total: 0 });
      });

      it('returns zero when no index exists', async () => {
        const versioning = defineVersioning(v1Schema).build();
        const versionedAdapter = new StorageIndexAdapter<
          typeof versionedStorageSettings,
          VersionedDoc
        >(esClient, loggerMock, versionedStorageSettings, { versioning });

        const result = await versionedAdapter.getClient().migrateDocuments();
        expect(result).toEqual({ migrated: 0, total: 0 });
      });

      it('is a no-op when versioning is not configured', async () => {
        const plainAdapter = new StorageIndexAdapter(
          esClient,
          loggerMock,
          versionedStorageSettings
        );

        const result = await plainAdapter.getClient().migrateDocuments();
        expect(result).toEqual({ migrated: 0, total: 0 });
      });
    });

    describe('constructor validation', () => {
      it('throws when __version is used as a schema property', () => {
        const badSettings = {
          name: 'bad_index',
          schema: {
            properties: {
              name: types.keyword(),
              [VERSION_FIELD]: types.long(),
            },
          },
        } satisfies StorageSettings;

        const versioning = defineVersioning(z.object({ name: z.string() })).build();

        expect(
          () =>
            new StorageIndexAdapter(esClient, loggerMock, badSettings, {
              versioning,
            })
        ).toThrow(`The field "${VERSION_FIELD}" is reserved`);
      });

      it('throws when a top-level schema property is missing from mappings', () => {
        const settings = {
          name: 'bad_index',
          schema: { properties: { name: types.keyword() } },
        } satisfies StorageSettings;

        const versioning = defineVersioning(
          z.object({ name: z.string(), missing: z.number() })
        ).build();

        expect(
          () => new StorageIndexAdapter(esClient, loggerMock, settings, { versioning })
        ).toThrow('Versioning schema properties [missing]');
      });

      it('throws when a nested schema property is missing from mappings', () => {
        const settings = {
          name: 'bad_index',
          schema: {
            properties: {
              name: types.keyword(),
              metadata: types.object({
                properties: { createdAt: { type: 'date' as const } },
              }),
            },
          },
        } satisfies StorageSettings;

        const versioning = defineVersioning(
          z.object({
            name: z.string(),
            metadata: z.object({
              createdAt: z.string(),
              updatedAt: z.string(),
            }),
          })
        ).build();

        expect(
          () => new StorageIndexAdapter(esClient, loggerMock, settings, { versioning })
        ).toThrow('Versioning schema properties [metadata.updatedAt]');
      });

      it('passes validation when nested properties are all mapped', () => {
        const settings = {
          name: 'good_index',
          schema: {
            properties: {
              name: types.keyword(),
              metadata: types.object({
                properties: {
                  createdAt: { type: 'date' as const },
                  tags: { type: 'keyword' as const },
                },
              }),
            },
          },
        } satisfies StorageSettings;

        const versioning = defineVersioning(
          z.object({
            name: z.string(),
            metadata: z.object({
              createdAt: z.string(),
              tags: z.array(z.string()),
            }),
          })
        ).build();

        expect(
          () => new StorageIndexAdapter(esClient, loggerMock, settings, { versioning })
        ).not.toThrow();
      });
    });
  });

  function createStorageIndexAdapter<TStorageSettings extends StorageSettings>(
    settings: TStorageSettings,
    options?: StorageIndexAdapterOptions<StorageDocumentOf<TStorageSettings>>
  ): SimpleStorageIndexAdapter<TStorageSettings> {
    return new StorageIndexAdapter(esClient, loggerMock, settings, options);
  }

  async function createServers() {
    const { startES } = createTestServers({
      adjustTimeout: jest.setTimeout,
      settings: {
        kbn: {
          cliArgs: {
            oss: false,
          },
        },
      },
    });

    esServer = await startES();

    jest.spyOn(getSchemaVersionModule, 'getSchemaVersion').mockReturnValue('current_version');
    esClient = esServer.es.getClient();
    loggerMock = createLoggerMock();
    adapter = createStorageIndexAdapter(storageSettings);
    client = adapter.getClient();
  }

  async function stopServers() {
    await esServer?.stop();
    jest.clearAllMocks();
  }

  async function verifyNoIndexTemplate() {
    const getIndexTemplateResponse = await esClient.indices.getIndexTemplate({
      name: '*',
    });

    expect(
      getIndexTemplateResponse.index_templates.find((indexTemplate) =>
        indexTemplate.name.startsWith(TEST_INDEX_NAME)
      )
    ).toBeUndefined();
  }

  async function verifyNoIndex() {
    const getIndexResponse = await esClient.indices
      .get({
        index: TEST_INDEX_NAME,
      })
      .catch((error) => {
        if (isResponseError(error) && error.statusCode === 404) {
          return {} as IndicesGetResponse;
        }
        throw error;
      });

    expect(getIndexResponse).toEqual({});
  }

  async function verifyIndex(options: { writeIndexName?: string; version?: string } = {}) {
    const { writeIndexName = `${TEST_INDEX_NAME}-000001`, version = 'current_version' } = options;

    const getIndexResponse = await esClient.indices
      .get({
        index: TEST_INDEX_NAME,
      })
      .catch((error) => {
        if (isResponseError(error) && error.statusCode === 404) {
          return {} as IndicesGetResponse;
        }
        throw error;
      });

    const indices = Object.keys(getIndexResponse);

    expect(indices).toEqual([writeIndexName]);

    expect(getIndexResponse[writeIndexName].mappings).toEqual({
      _meta: {
        version,
      },
      dynamic: 'strict',
      properties: {
        foo: {
          type: 'keyword',
        },
      },
    });

    expect(getIndexResponse[writeIndexName].aliases).toEqual({
      [TEST_INDEX_NAME]: {
        is_write_index: true,
      },
    });
  }

  async function verifyClean() {
    await client.clean();

    // verify that the index template is removed
    const templates = await esClient.indices
      .getIndexTemplate({
        name: TEST_INDEX_NAME,
      })
      .catch((error) => {
        if (isResponseError(error) && error.statusCode === 404) {
          return { index_templates: [] };
        }
        throw error;
      });

    expect(templates.index_templates).toEqual([]);

    // verify that the backing indices are removed
    const indices = await esClient.indices.get({
      index: `${TEST_INDEX_NAME}*`,
    });
    expect(Object.keys(indices)).toEqual([]);
  }
});
