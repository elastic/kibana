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
      mappings: { properties: {} },
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

  describe('scriptUpdate', () => {
    it('returns updated when ES reports an update', async () => {
      const { esClient, dataAccess } = createDataAccess();
      esClient.update.mockResolvedValue({ result: 'updated' } as never);

      await expect(
        dataAccess.scriptUpdate({
          id: 'step-1',
          script: 'ctx._source.status = params.status',
          params: { status: 'completed' },
          retryOnConflict: 3,
          refresh: 'wait_for',
        })
      ).resolves.toEqual({ result: 'updated' });

      expect(esClient.update).toHaveBeenCalledWith({
        index: '.workflows-executions',
        id: 'step-1',
        script: {
          source: 'ctx._source.status = params.status',
          lang: 'painless',
          params: { status: 'completed' },
        },
        retry_on_conflict: 3,
        refresh: 'wait_for',
      });
    });

    it('returns noop when ES reports a noop', async () => {
      const { esClient, dataAccess } = createDataAccess();
      esClient.update.mockResolvedValue({ result: 'noop' } as never);

      await expect(
        dataAccess.scriptUpdate({
          id: 'step-1',
          script: 'ctx.op = "noop"',
          params: {},
        })
      ).resolves.toEqual({ result: 'noop' });
    });

    it('returns not_found when ES throws a 404', async () => {
      const { esClient, dataAccess } = createDataAccess();
      const notFoundError = new Error('Not Found');
      (notFoundError as { statusCode?: number }).statusCode = 404;
      esClient.update.mockRejectedValue(notFoundError);

      await expect(
        dataAccess.scriptUpdate({
          id: 'missing-step',
          script: 'ctx.op = "noop"',
          params: {},
        })
      ).resolves.toEqual({ result: 'not_found' });
    });

    it('omits optional retry and refresh when not provided', async () => {
      const { esClient, dataAccess } = createDataAccess();
      esClient.update.mockResolvedValue({ result: 'updated' } as never);

      await dataAccess.scriptUpdate({
        id: 'step-1',
        script: 'ctx._source.status = params.status',
        params: { status: 'completed' },
      });

      expect(esClient.update).toHaveBeenCalledWith({
        index: '.workflows-executions',
        id: 'step-1',
        script: {
          source: 'ctx._source.status = params.status',
          lang: 'painless',
          params: { status: 'completed' },
        },
      });
    });

    it('rethrows unexpected ES failures', async () => {
      const { esClient, dataAccess } = createDataAccess();
      esClient.update.mockRejectedValue(new Error('cluster unavailable'));

      await expect(
        dataAccess.scriptUpdate({
          id: 'step-1',
          script: 'ctx._source.status = params.status',
          params: { status: 'completed' },
        })
      ).rejects.toThrow('cluster unavailable');
    });
  });
});
