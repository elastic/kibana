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
import { StorageIndexAdapter, type StorageSettings } from '../../..';
import type { Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import type { IndicesGetResponse } from '@elastic/elasticsearch/lib/api/types';
import type { SimpleStorageIndexAdapter, StorageIndexAdapterOptions } from '..';
import type { Client } from '@elastic/elasticsearch';

const TEST_INDEX_NAME = 'test_index';
const TEST_CONCRETE_INDEX_NAME = `${TEST_INDEX_NAME}-000001`;

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
    version: 1,
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

  afterAll(async () => {
    await stopServers();
  });

  beforeAll(async () => {
    await createServers();
    resetAdapterClient();
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

  describe('when writing/bootstrapping with an n-1 version index', () => {
    beforeEach(async () => {
      await client.index({ id: 'foo', document: { foo: 'bar' } });
      await verifyIndex({ version: 1 });
    });

    afterEach(async () => {
      await client?.clean();
      resetAdapterClient();
    });

    it('updates the existing write index in place to v2', async () => {
      const putMappingSpy = jest.spyOn(esClient.indices, 'putMapping');
      const storageSettingsV2 = {
        ...storageSettings,
        version: 2,
      } satisfies StorageSettings;
      client = new StorageIndexAdapter(esClient, loggerMock, storageSettingsV2).getClient();

      for (const _ of [1, 2, 3]) {
        await client.index({ id: 'foo', document: { foo: 'bar' } });
        await verifyIndex({ version: 2 });
      }
      expect(putMappingSpy).toHaveBeenCalledTimes(1);
    });

    it('does not update the existing write index in place if the version is the same, even if mappings changed', async () => {
      const storageSettingsNotQuiteV2 = {
        ...storageSettings,
        schema: {
          ...storageSettings.schema,
          properties: {
            // change the mappings
            ...storageSettings.schema.properties,
            bar: {
              type: 'keyword',
            },
          },
        },
        version: 1,
      } satisfies StorageSettings;
      client = new StorageIndexAdapter(esClient, loggerMock, storageSettingsNotQuiteV2).getClient();
      await client.index({ id: 'foo', document: { foo: 'bar' } });
      await verifyIndex({ version: 1 });

      const {
        [TEST_CONCRETE_INDEX_NAME]: { mappings },
      } = await esClient.indices.get({ index: TEST_INDEX_NAME });

      expect(mappings!._meta?.version).toEqual(1);
      expect(mappings!.properties).toEqual(storageSettings.schema.properties);
    });

    it('deletes the documents', async () => {
      await verifyClean();
    });
  });

  describe('when writing/bootstrapping with a legacy-style version index', () => {
    beforeAll(async () => {
      // This represents an index that was created before the versioning system was introduced
      await esClient.indices.create({
        index: TEST_CONCRETE_INDEX_NAME,
        aliases: {
          [TEST_INDEX_NAME]: {
            is_write_index: true,
          },
        },
        mappings: {
          _meta: {
            version: 'abc', // not a number!
          },
          properties: storageSettings.schema.properties,
        },
      });
    });

    afterAll(async () => {
      await client?.clean();
    });

    it('updates the version to v1', async () => {
      await client.index({ id: 'foo', document: { foo: 'bar' } });
      await verifyIndex({ version: 1 });
    });
  });

  describe('when writing/bootstrapping with an existing, incompatible index', () => {
    beforeAll(async () => {
      await client.index({ id: 'foo', document: { foo: 'bar' } });
    });

    afterAll(async () => {
      await client?.clean();
    });

    it('fails when indexing', async () => {
      const incompatibleAdapter = createStorageIndexAdapter({
        ...storageSettings,
        version: 2,
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

  function resetAdapterClient() {
    adapter = createStorageIndexAdapter(storageSettings);
    client = adapter.getClient();
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

    esClient = esServer.es.getClient();
    loggerMock = createLoggerMock();
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

  async function verifyIndex(options: { writeIndexName?: string; version?: number } = {}) {
    const { writeIndexName = TEST_CONCRETE_INDEX_NAME, version = 1 } = options;

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
