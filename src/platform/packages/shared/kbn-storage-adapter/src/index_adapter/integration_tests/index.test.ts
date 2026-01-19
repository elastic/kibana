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
import { BulkOperationError, StorageIndexAdapter, type StorageSettings } from '../../..';
import type { Logger } from '@kbn/core/server';
import * as getSchemaVersionModule from '../../get_schema_version';
import { isResponseError } from '@kbn/es-errors';
import type { IndicesGetResponse } from '@elastic/elasticsearch/lib/api/types';
import type { SimpleStorageIndexAdapter, StorageIndexAdapterOptions } from '..';
import type { Client } from '@elastic/elasticsearch';

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
