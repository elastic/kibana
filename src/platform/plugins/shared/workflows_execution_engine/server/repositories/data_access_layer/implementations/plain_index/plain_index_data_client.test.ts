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
});
