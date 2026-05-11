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

import type { WorkflowSearchDeps } from './types';
import { WorkflowSearchService } from './workflow_search_service';
import { createCircuitBreakerError } from '../api/routes/utils/__fixtures__/circuit_breaker_error';

/**
 * The PIT-paginated path opens a Point-in-Time on the workflows index, paginates
 * with `search_after`, and must close the PIT in a `finally` block. These tests
 * pin down two contracts that protect us under circuit-breaker pressure:
 *
 *   1. If `esClient.search` rejects mid-pagination (e.g. the request breaker
 *      trips on a large terms aggregation result), `closePointInTime` is still
 *      called — leaking PITs is a memory and resource hazard at scale.
 *
 *   2. If `closePointInTime` itself rejects with a circuit breaker error, the
 *      original search error is what propagates to the caller (the close
 *      failure is logged as a warning, not thrown). Masking the original error
 *      would make debugging upstream incidents painful.
 */

const makeDeps = () => {
  const storageClient = { search: jest.fn() };
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggerMock.create();
  const deps: WorkflowSearchDeps = {
    logger,
    workflowStorage: {
      getClient: () => storageClient,
    } as unknown as WorkflowSearchDeps['workflowStorage'],
    esClient,
  };
  return { deps, storageClient, esClient, logger };
};

describe('WorkflowSearchService — circuit breaker resilience', () => {
  describe('getWorkflowsSubscribedToTrigger PIT lifecycle', () => {
    it('still calls closePointInTime when search rejects with a circuit breaker error', async () => {
      const { deps, esClient } = makeDeps();
      esClient.openPointInTime.mockResolvedValue({ id: 'pit-cb-1' } as never);
      esClient.search.mockRejectedValue(createCircuitBreakerError({ kind: 'request' }));

      const service = new WorkflowSearchService(deps);

      await expect(
        service.getWorkflowsSubscribedToTrigger('alert.trigger', 'default')
      ).rejects.toMatchObject({
        statusCode: 429,
        body: { error: { type: 'circuit_breaking_exception' } },
      });

      expect(esClient.closePointInTime).toHaveBeenCalledTimes(1);
      expect(esClient.closePointInTime).toHaveBeenCalledWith({ id: 'pit-cb-1' });
    });

    it('propagates the original search error when closePointInTime also rejects with a circuit breaker', async () => {
      const { deps, esClient, logger } = makeDeps();
      esClient.openPointInTime.mockResolvedValue({ id: 'pit-cb-2' } as never);
      const searchError = createCircuitBreakerError({ kind: 'parent' });
      const closeError = createCircuitBreakerError({ kind: 'request' });
      esClient.search.mockRejectedValue(searchError);
      esClient.closePointInTime.mockRejectedValue(closeError);

      const service = new WorkflowSearchService(deps);

      await expect(
        service.getWorkflowsSubscribedToTrigger('alert.trigger', 'default')
      ).rejects.toBe(searchError);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to close PIT pit-cb-2')
      );
    });
  });

  describe('getWorkflowAggs', () => {
    it('lets a circuit breaker rejection from the storage client propagate uncaught', async () => {
      const { deps } = makeDeps();
      const storageClient = { search: jest.fn().mockRejectedValue(createCircuitBreakerError()) };
      const depsWithFailingStorage: WorkflowSearchDeps = {
        ...deps,
        workflowStorage: {
          getClient: () => storageClient,
        } as unknown as WorkflowSearchDeps['workflowStorage'],
      };

      const service = new WorkflowSearchService(depsWithFailingStorage);

      await expect(service.getWorkflowAggs(['name'], 'default')).rejects.toMatchObject({
        statusCode: 429,
        body: { error: { type: 'circuit_breaking_exception' } },
      });
      expect(storageClient.search).toHaveBeenCalledTimes(1);
    });
  });
});
