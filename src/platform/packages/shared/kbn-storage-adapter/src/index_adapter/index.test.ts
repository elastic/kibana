/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
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
    },
  } as unknown as jest.Mocked<ElasticsearchClient>;
  return client;
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
