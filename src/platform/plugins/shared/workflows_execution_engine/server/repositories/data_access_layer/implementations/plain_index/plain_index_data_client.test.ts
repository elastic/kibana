/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import { PlainIndexDataClient } from './plain_index_data_client';

describe('PlainIndexDataClient', () => {
  const createDataAccess = () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const logger = loggerMock.create();
    const dataAccess = new PlainIndexDataClient<{ id: string }>({
      esClient,
      indexName: '.workflows-executions',
      logger,
    });
    return { esClient, logger, dataAccess };
  };

  it('deleteByQuery targets the configured index', async () => {
    const { esClient, dataAccess } = createDataAccess();
    esClient.deleteByQuery.mockResolvedValue({ deleted: 2, total: 2 } as never);

    const query = { term: { workflowId: 'wf-1' } };
    await dataAccess.deleteByQuery({ query, refresh: true, conflicts: 'proceed' });

    expect(esClient.deleteByQuery).toHaveBeenCalledWith({
      index: '.workflows-executions',
      query,
      refresh: true,
      conflicts: 'proceed',
    });
  });

  it('bulk stamps the configured index on plain items', async () => {
    const { esClient, dataAccess } = createDataAccess();
    esClient.bulk.mockResolvedValue({
      errors: false,
      items: [{ create: { _id: 'a', _index: '.workflows-executions', result: 'created' } }],
    } as never);

    await dataAccess.bulk({
      items: [{ operation: 'create', document: { id: 'a' } }],
    });

    expect(esClient.bulk).toHaveBeenCalledWith(
      expect.objectContaining({
        operations: [{ create: { _id: 'a', _index: '.workflows-executions' } }, { id: 'a' }],
      })
    );
  });

  it('bulk updater mgets the configured index', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const dataAccess = new PlainIndexDataClient<{ id: string; status: string }>({
      esClient,
      indexName: '.workflows-executions',
      logger: loggerMock.create(),
    });
    esClient.mget.mockResolvedValue({
      docs: [
        {
          _id: 'a',
          _index: '.workflows-executions',
          found: true,
          _source: { id: 'a', status: 'queued' },
          _seq_no: 0,
          _primary_term: 1,
        },
      ],
    } as never);
    esClient.bulk.mockResolvedValue({
      errors: false,
      items: [
        {
          update: {
            _id: 'a',
            _index: '.workflows-executions',
            result: 'updated',
            _seq_no: 1,
            _primary_term: 1,
          },
        },
      ],
    } as never);

    await dataAccess.bulk({
      items: [
        {
          operation: 'update',
          documentId: 'a',
          sourceFields: ['status'] as const,
          updater: (current) => (current.status === 'queued' ? { status: 'pending' } : 'noop'),
        },
      ],
    });

    expect(esClient.mget).toHaveBeenCalledWith({
      docs: [
        {
          _id: 'a',
          _index: '.workflows-executions',
          _source: { includes: ['status'] },
        },
      ],
    });
  });
});
