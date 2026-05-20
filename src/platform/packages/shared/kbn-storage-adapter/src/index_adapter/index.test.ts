/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { TransportResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import type { StorageTransportOptions } from '../..';
import { StorageIndexAdapter, type StorageSettings } from '../..';

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

const storageSettings = {
  name: 'test_index',
  schema: {
    properties: {
      foo: { type: 'keyword' as const },
    },
  },
} satisfies StorageSettings;

const createMockEsClient = () => {
  const client = {
    info: jest.fn().mockResolvedValue({
      version: { build_flavor: 'default' },
    }),
    search: jest.fn().mockResolvedValue({
      hits: { hits: [{ _id: 'doc1', _index: 'test_index', _source: { foo: 'bar' } }] },
    }),
    index: jest.fn().mockResolvedValue({
      _id: 'doc1',
      _index: 'test_index-000001',
      _shards: { successful: 1 },
      result: 'created',
    }),
    bulk: jest.fn().mockResolvedValue({
      errors: false,
      items: [{ index: { _id: 'doc1', result: 'created', status: 201 } }],
      took: 1,
    }),
    delete: jest.fn().mockResolvedValue({ result: 'deleted' }),
    indices: {
      putIndexTemplate: jest.fn().mockResolvedValue({}),
      getIndexTemplate: jest.fn().mockResolvedValue({
        index_templates: [
          {
            index_template: {
              _meta: { version: 'current' },
            },
          },
        ],
      }),
      get: jest.fn().mockResolvedValue({
        'test_index-000001': {
          mappings: { _meta: { version: 'current' } },
          aliases: { test_index: { is_write_index: true } },
        },
      }),
      getAlias: jest.fn().mockResolvedValue({
        'test_index-000001': {
          aliases: { test_index: { is_write_index: true } },
        },
      }),
      create: jest.fn().mockResolvedValue({}),
      exists: jest.fn().mockResolvedValue(true),
      simulateIndexTemplate: jest.fn().mockResolvedValue({
        template: { mappings: {} },
      }),
      putMapping: jest.fn().mockResolvedValue({}),
      putSettings: jest.fn().mockResolvedValue({}),
    },
  } as unknown as jest.Mocked<ElasticsearchClient>;
  return client;
};

interface EsqlQueryMock {
  esql: {
    query: jest.Mock;
  };
}

const addEsqlQueryMock = (client: jest.Mocked<ElasticsearchClient>, query: jest.Mock): void => {
  (client as unknown as EsqlQueryMock).esql = { query };
};

describe('StorageIndexAdapter - transport options forwarding', () => {
  let esClient: jest.Mocked<ElasticsearchClient>;
  let loggerMock: jest.Mocked<Logger>;
  const transportOptions: StorageTransportOptions = {
    maxResponseSize: 50 * 1024 * 1024,
    requestTimeout: 30_000,
  };

  beforeEach(() => {
    esClient = createMockEsClient();
    loggerMock = createLoggerMock();
  });

  it('forwards transport options to esClient.search', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await client.search(
      { track_total_hits: false, size: 10, query: { match_all: {} } },
      transportOptions
    );

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'test_index' }),
      transportOptions
    );
  });

  it('forwards transport options to esClient.index', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await client.index({ id: 'doc1', document: { foo: 'bar' } }, transportOptions);

    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'doc1', require_alias: true }),
      transportOptions
    );
  });

  it('forwards transport options to esClient.bulk', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await client.bulk(
      {
        operations: [{ index: { _id: 'doc1', document: { foo: 'bar' } } }],
      },
      transportOptions
    );

    expect(esClient.bulk).toHaveBeenCalledWith(
      expect.objectContaining({ require_alias: true }),
      transportOptions
    );
  });

  it('forwards transport options to esClient.delete', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await client.delete({ id: 'doc1' }, transportOptions);

    expect(esClient.delete).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'doc1' }),
      transportOptions
    );
  });

  it('forwards transport options through get to esClient.search', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await client.get({ id: 'doc1' }, transportOptions);

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ terminate_after: 1 }),
      transportOptions
    );
  });

  it('includes settings in the index template', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await client.index({ id: 'doc1', document: { foo: 'bar' } });

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        template: expect.objectContaining({
          settings: expect.objectContaining({
            auto_expand_replicas: '0-1',
            number_of_shards: 1,
          }),
        }),
      })
    );
  });

  it('omits index template settings when isServerless option is true', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings, {
      isServerless: true,
    });
    const client = adapter.getClient();

    await client.index({ id: 'doc1', document: { foo: 'bar' } });

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        template: expect.not.objectContaining({ settings: expect.anything() }),
      })
    );
  });

  it('includes index template settings when isServerless option is false', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings, {
      isServerless: false,
    });
    const client = adapter.getClient();

    await client.index({ id: 'doc1', document: { foo: 'bar' } });

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        template: expect.objectContaining({
          settings: expect.objectContaining({ auto_expand_replicas: '0-1' }),
        }),
      })
    );
  });

  it('omits settings when info() reports serverless and isServerless is not provided', async () => {
    (esClient.info as jest.Mock).mockResolvedValue({
      version: { build_flavor: 'serverless' },
    });

    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await client.index({ id: 'doc1', document: { foo: 'bar' } });

    expect(esClient.info).toHaveBeenCalledTimes(1);
    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        template: expect.not.objectContaining({ settings: expect.anything() }),
      })
    );
  });

  it('does not call info() when isServerless option is provided', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings, {
      isServerless: true,
    });
    const client = adapter.getClient();

    await client.index({ id: 'doc1', document: { foo: 'bar' } });

    expect(esClient.info).not.toHaveBeenCalled();
  });

  it('retries without settings when both info() and isServerless are unavailable', async () => {
    (esClient.info as jest.Mock).mockRejectedValue(new Error('forbidden'));

    const serverlessError = new errors.ResponseError({
      statusCode: 400,
      headers: {},
      warnings: [],
      meta: {} as TransportResult['meta'],
      body: {
        error: {
          type: 'illegal_argument_exception',
          reason:
            'Settings [index.auto_expand_replicas,index.number_of_shards] are not available when running in serverless mode',
        },
      },
    } as TransportResult);
    (esClient.indices.putIndexTemplate as jest.Mock).mockRejectedValueOnce(serverlessError);

    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await client.index({ id: 'doc1', document: { foo: 'bar' } });

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledTimes(2);
    expect(esClient.indices.putIndexTemplate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        template: expect.objectContaining({
          settings: expect.objectContaining({ auto_expand_replicas: '0-1' }),
        }),
      })
    );
    expect(esClient.indices.putIndexTemplate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        template: expect.not.objectContaining({ settings: expect.anything() }),
      })
    );
  });

  it('skips settings on subsequent writes after reactive serverless detection', async () => {
    (esClient.info as jest.Mock).mockRejectedValue(new Error('forbidden'));

    const serverlessError = new errors.ResponseError({
      statusCode: 400,
      headers: {},
      warnings: [],
      meta: {} as TransportResult['meta'],
      body: {
        error: {
          type: 'illegal_argument_exception',
          reason:
            'Settings [index.auto_expand_replicas,index.number_of_shards] are not available when running in serverless mode',
        },
      },
    } as TransportResult);
    (esClient.indices.putIndexTemplate as jest.Mock).mockRejectedValueOnce(serverlessError);

    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await client.index({ id: 'doc1', document: { foo: 'bar' } });
    await client.index({ id: 'doc2', document: { foo: 'baz' } });

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledTimes(3);
    expect(esClient.indices.putIndexTemplate).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        template: expect.not.objectContaining({ settings: expect.anything() }),
      })
    );
  });

  it('works without transport options (backward compatible)', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await client.search({ track_total_hits: false, size: 10, query: { match_all: {} } });

    expect(esClient.search).toHaveBeenCalledWith(expect.objectContaining({ index: 'test_index' }));
  });

  it('forwards transport options to esClient.bulk for create operations', async () => {
    esClient.bulk.mockResolvedValueOnce({
      errors: false,
      items: [{ create: { _id: 'doc1', result: 'created', status: 201, _index: 'test_index' } }],
      took: 1,
    });
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await client.bulk(
      {
        operations: [{ create: { _id: 'doc1', document: { foo: 'bar' } } }],
      },
      transportOptions
    );

    expect(esClient.bulk).toHaveBeenCalledWith(
      expect.objectContaining({
        require_alias: true,
        operations: [{ create: { _id: 'doc1' } }, { foo: 'bar' }],
      }),
      transportOptions
    );
  });
});

describe('StorageIndexAdapter - esql method', () => {
  let esClient: jest.Mocked<ElasticsearchClient>;
  let esqlQuery: jest.Mock;
  let loggerMock: jest.Mocked<Logger>;

  const mockEsqlResponse = {
    columns: [{ name: 'foo', type: 'keyword' }],
    values: [['bar']],
  };

  beforeEach(() => {
    esClient = createMockEsClient();
    esqlQuery = jest.fn().mockResolvedValue(mockEsqlResponse);
    addEsqlQueryMock(esClient, esqlQuery);
    loggerMock = createLoggerMock();
  });

  it('forwards query and returns ES|QL response', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    const result = await client.esql({ query: 'FROM test_index | LIMIT 1' });

    expect(esqlQuery).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'FROM test_index | LIMIT 1', format: 'json' })
    );
    expect(result).toEqual(mockEsqlResponse);
  });

  it('forwards params to esClient.esql.query', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    const params = [{ p: '*foo*' }];
    await client.esql({ query: 'FROM test_index | WHERE foo LIKE ?p | LIMIT 5', params });

    expect(esqlQuery).toHaveBeenCalledWith(expect.objectContaining({ params }));
  });

  it('returns empty response when index does not exist (404 path)', async () => {
    const notFoundError = new errors.ResponseError({
      statusCode: 404,
      headers: {},
      warnings: [],
      meta: {} as TransportResult['meta'],
      body: { error: { type: 'index_not_found_exception', reason: 'no such index' } },
    } as TransportResult);
    esqlQuery.mockRejectedValueOnce(notFoundError);

    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    const result = await client.esql({ query: 'FROM test_index | LIMIT 1' });

    expect(result).toEqual({ columns: [], values: [] });
  });

  it('returns empty response for ES|QL verification_exception with Unknown index', async () => {
    const unknownIndexError = new errors.ResponseError({
      statusCode: 400,
      headers: {},
      warnings: [],
      meta: {} as TransportResult['meta'],
      body: {
        error: {
          type: 'verification_exception',
          reason: 'Unknown index [missing_index]',
        },
      },
    } as TransportResult);
    esqlQuery.mockRejectedValueOnce(unknownIndexError);

    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    const result = await client.esql({ query: 'FROM test_index | LIMIT 1' });

    expect(result).toEqual({ columns: [], values: [] });
  });

  it('rejects ES|QL queries that target a different index', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await expect(client.esql({ query: 'FROM other_index | LIMIT 1' })).rejects.toThrow(
      'StorageClientEsql query must target storage index [test_index], got [other_index]'
    );
    expect(esqlQuery).not.toHaveBeenCalled();
  });

  it('rejects ES|QL queries that mix the storage index with another source', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await expect(client.esql({ query: 'FROM test_index, other_index | LIMIT 1' })).rejects.toThrow(
      'StorageClientEsql query must target storage index [test_index], got [test_index, other_index]'
    );
    expect(esqlQuery).not.toHaveBeenCalled();
  });

  it('rejects ES|QL queries without a FROM command', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await expect(client.esql({ query: 'ROW foo = "bar"' })).rejects.toThrow(
      'StorageClientEsql query must include a FROM command'
    );
    expect(esqlQuery).not.toHaveBeenCalled();
  });

  it('rejects ES|QL queries that cannot be parsed', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await expect(client.esql({ query: 'FROM | LIMIT 1' })).rejects.toThrow(
      'StorageClientEsql query could not be parsed'
    );
    expect(esqlQuery).not.toHaveBeenCalled();
  });

  it('rethrows ES|QL verification_exception errors that are not Unknown index', async () => {
    const verificationError = new errors.ResponseError({
      statusCode: 400,
      headers: {},
      warnings: [],
      meta: {} as TransportResult['meta'],
      body: {
        error: {
          type: 'verification_exception',
          reason: 'Unknown column [foo]',
        },
      },
    } as TransportResult);
    esqlQuery.mockRejectedValueOnce(verificationError);

    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await expect(client.esql({ query: 'FROM test_index | LIMIT 1' })).rejects.toThrow(
      'verification_exception'
    );
  });

  it('applies migrateSource to _source column when migrateSource option is configured', async () => {
    const rawSource = { foo: 'bar', version: 0 };
    const migratedSource = { foo: 'bar', version: 1 };
    const esqlWithSourceResponse = {
      columns: [
        { name: '_source', type: 'unsupported' },
        { name: 'foo', type: 'keyword' },
      ],
      values: [[rawSource, 'bar']],
    };
    esqlQuery.mockResolvedValueOnce(esqlWithSourceResponse);

    const migrateSource = jest.fn().mockReturnValue(migratedSource);
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings, {
      migrateSource,
    });
    const client = adapter.getClient();

    const result = await client.esql({ query: 'FROM test_index METADATA _source | LIMIT 1' });

    expect(migrateSource).toHaveBeenCalledWith(rawSource);
    expect(result.values[0][0]).toEqual(migratedSource);
  });

  it('skips migrateSource when migrateSource: false is passed', async () => {
    const rawSource = { foo: 'bar', version: 0 };
    const esqlWithSourceResponse = {
      columns: [{ name: '_source', type: 'unsupported' }],
      values: [[rawSource]],
    };
    esqlQuery.mockResolvedValueOnce(esqlWithSourceResponse);

    const migrateSource = jest.fn().mockReturnValue({ foo: 'bar', version: 1 });
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings, {
      migrateSource,
    });
    const client = adapter.getClient();

    const result = await client.esql({
      query: 'FROM test_index METADATA _source | LIMIT 1',
      migrateSource: false,
    });

    expect(migrateSource).not.toHaveBeenCalled();
    expect(result.values[0][0]).toEqual(rawSource);
  });

  it('forwards filter to esClient.esql.query', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    const filter = {
      bool: { filter: [{ range: { '@timestamp': { gte: 'now-1h' } } }] },
    };
    await client.esql({ query: 'FROM test_index | LIMIT 5', filter });

    expect(esqlQuery).toHaveBeenCalledWith(expect.objectContaining({ filter }));
  });

  it('forwards transport options to esClient.esql.query', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    const transportOptions: StorageTransportOptions = {
      maxResponseSize: 50 * 1024 * 1024,
      requestTimeout: 30_000,
    };
    await client.esql({ query: 'FROM test_index | LIMIT 1' }, transportOptions);

    expect(esqlQuery).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'FROM test_index | LIMIT 1' }),
      transportOptions
    );
  });

  it('awaits ensureMappingsBeforeReading before issuing the ES|QL query', async () => {
    // Defer the alias lookup that updateMappingsIfNeeded awaits so the
    // ensureMappingsBeforeReading promise stays pending until we release it.
    let releaseGetAlias!: () => void;
    const getAliasPromise = new Promise<{
      'test_index-000001': { aliases: { test_index: { is_write_index: true } } };
    }>((resolve) => {
      releaseGetAlias = () =>
        resolve({
          'test_index-000001': { aliases: { test_index: { is_write_index: true } } },
        });
    });
    (esClient.indices.getAlias as jest.Mock).mockReturnValueOnce(getAliasPromise);

    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    const esqlPromise = client.esql({ query: 'FROM test_index | LIMIT 1' });

    // Microtask flush; the adapter should still be waiting on the alias lookup,
    // so esql.query must not have been issued yet.
    await Promise.resolve();
    await Promise.resolve();
    expect(esqlQuery).not.toHaveBeenCalled();

    releaseGetAlias();
    await esqlPromise;

    expect(esqlQuery).toHaveBeenCalledTimes(1);
  });
});
