/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';

import { deleteWorkflows } from './workflow_deletion';

const logger = loggerMock.create();

const makeWorkflowSource = (overrides = {}) => ({
  name: 'Test',
  description: '',
  enabled: true,
  tags: [],
  triggerTypes: [],
  yaml: 'name: Test',
  definition: null,
  createdBy: 'user1',
  lastUpdatedBy: 'user1',
  spaceId: 'default',
  valid: true,
  deleted_at: null,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const makeStorageClient = (
  hits: Array<{ _id: string; _source: ReturnType<typeof makeWorkflowSource> }>
) => {
  const mockClient = {
    search: jest.fn().mockResolvedValue({
      hits: { hits: hits.map((h) => ({ _id: h._id, _source: h._source })) },
    }),
    bulk: jest.fn().mockResolvedValue({
      items: hits.map((h) => ({ index: { _id: h._id, status: 200 } })),
    }),
    delete: jest.fn().mockResolvedValue({ result: 'deleted' }),
  };
  return {
    client: mockClient,
    storage: { getClient: () => mockClient } as any,
  };
};

const makeEsClient = () =>
  ({
    deleteByQuery: jest.fn().mockResolvedValue({ deleted: 0 }),
  } as unknown as ElasticsearchClient);

const noopExecutions = jest.fn().mockResolvedValue({ total: 0, results: [] });

describe('deleteWorkflows', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('soft delete', () => {
    it('marks workflows as deleted and disabled', async () => {
      const { client, storage } = makeStorageClient([
        { _id: 'wf-1', _source: makeWorkflowSource() },
      ]);

      const result = await deleteWorkflows({
        ids: ['wf-1'],
        spaceId: 'default',
        force: false,
        storage,
        esClient: makeEsClient(),
        taskScheduler: null,
        logger,
        getWorkflowExecutions: noopExecutions,
      });

      expect(result.deleted).toBe(1);
      expect(result.successfulIds).toEqual(['wf-1']);
      expect(result.failures).toEqual([]);

      const bulkOps = client.bulk.mock.calls[0][0].operations;
      expect(bulkOps[0].index.document).toMatchObject({
        enabled: false,
        deleted_at: expect.any(Date),
      });
    });

    it('collects failures from partial bulk errors', async () => {
      const { client, storage } = makeStorageClient([
        { _id: 'wf-1', _source: makeWorkflowSource() },
        { _id: 'wf-2', _source: makeWorkflowSource() },
      ]);

      client.bulk.mockResolvedValue({
        items: [
          { index: { _id: 'wf-1', status: 200 } },
          { index: { _id: 'wf-2', status: 400, error: { type: 'error', reason: 'bulk fail' } } },
        ],
      });

      const result = await deleteWorkflows({
        ids: ['wf-1', 'wf-2'],
        spaceId: 'default',
        force: false,
        storage,
        esClient: makeEsClient(),
        taskScheduler: null,
        logger,
        getWorkflowExecutions: noopExecutions,
      });

      expect(result.deleted).toBe(1);
      expect(result.successfulIds).toEqual(['wf-1']);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].id).toBe('wf-2');
    });

    it('returns zero deleted when no workflows found', async () => {
      const { storage } = makeStorageClient([]);

      const result = await deleteWorkflows({
        ids: ['wf-missing'],
        spaceId: 'default',
        force: false,
        storage,
        esClient: makeEsClient(),
        taskScheduler: null,
        logger,
        getWorkflowExecutions: noopExecutions,
      });

      expect(result).toEqual({
        total: 1,
        deleted: 0,
        successfulIds: [],
        failures: [],
      });
    });

    it('only counts existing ids as deleted when the request mixes found and missing', async () => {
      const { storage } = makeStorageClient([{ _id: 'wf-1', _source: makeWorkflowSource() }]);

      const result = await deleteWorkflows({
        ids: ['wf-1', 'wf-missing'],
        spaceId: 'default',
        force: false,
        storage,
        esClient: makeEsClient(),
        taskScheduler: null,
        logger,
        getWorkflowExecutions: noopExecutions,
      });

      expect(result).toEqual({
        total: 2,
        deleted: 1,
        successfulIds: ['wf-1'],
        failures: [],
      });
    });
  });

  describe('hard delete', () => {
    it('deletes documents and purges related data', async () => {
      const { client, storage } = makeStorageClient([
        { _id: 'wf-1', _source: makeWorkflowSource() },
      ]);
      const esClient = makeEsClient();

      const result = await deleteWorkflows({
        ids: ['wf-1'],
        spaceId: 'default',
        force: true,
        storage,
        esClient,
        taskScheduler: null,
        logger,
        getWorkflowExecutions: noopExecutions,
      });

      expect(result.deleted).toBe(1);
      expect(result.successfulIds).toEqual(['wf-1']);
      expect(client.delete).toHaveBeenCalledWith({ id: 'wf-1' });
      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(2);
    });

    it('throws when workflows have running executions', async () => {
      const { client, storage } = makeStorageClient([
        { _id: 'wf-1', _source: makeWorkflowSource() },
      ]);
      // Mock: running execution found
      const getWorkflowExecutions = jest.fn().mockResolvedValue({ total: 1, results: [{}] });
      // Mock: bulk disable succeeds, then bulk restore succeeds
      client.bulk
        .mockResolvedValueOnce({
          items: [{ index: { _id: 'wf-1', status: 200 } }],
        })
        .mockResolvedValueOnce({
          items: [{ index: { _id: 'wf-1', status: 200 } }],
        });

      await expect(
        deleteWorkflows({
          ids: ['wf-1'],
          spaceId: 'default',
          force: true,
          storage,
          esClient: makeEsClient(),
          taskScheduler: null,
          logger,
          getWorkflowExecutions,
        })
      ).rejects.toThrow('Cannot force-delete workflows with running executions');

      // The workflow should have been disabled then restored
      expect(client.bulk).toHaveBeenCalledTimes(2);
      expect(client.delete).not.toHaveBeenCalled();
    });

    it('collects failures when individual document deletion fails', async () => {
      const { client, storage } = makeStorageClient([
        { _id: 'wf-1', _source: makeWorkflowSource() },
      ]);
      client.delete.mockRejectedValue(new Error('doc delete failed'));

      const result = await deleteWorkflows({
        ids: ['wf-1'],
        spaceId: 'default',
        force: true,
        storage,
        esClient: makeEsClient(),
        taskScheduler: null,
        logger,
        getWorkflowExecutions: noopExecutions,
      });

      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].error).toBe('doc delete failed');
    });

    it('restores disabled workflows when execution check throws', async () => {
      const { client, storage } = makeStorageClient([
        { _id: 'wf-1', _source: makeWorkflowSource() },
      ]);
      const getWorkflowExecutions = jest
        .fn()
        .mockRejectedValue(new Error('execution lookup failed'));
      client.bulk
        .mockResolvedValueOnce({
          items: [{ index: { _id: 'wf-1', status: 200 } }],
        })
        .mockResolvedValueOnce({
          items: [{ index: { _id: 'wf-1', status: 200 } }],
        });

      await expect(
        deleteWorkflows({
          ids: ['wf-1'],
          spaceId: 'default',
          force: true,
          storage,
          esClient: makeEsClient(),
          taskScheduler: null,
          logger,
          getWorkflowExecutions,
        })
      ).rejects.toThrow('execution lookup failed');

      // Disable bulk + restore bulk = 2 calls; no delete should have run
      expect(client.bulk).toHaveBeenCalledTimes(2);
      expect(client.delete).not.toHaveBeenCalled();
    });

    it('logs warning but does not throw when purge fails', async () => {
      const { storage } = makeStorageClient([{ _id: 'wf-1', _source: makeWorkflowSource() }]);
      const esClient = makeEsClient();
      (esClient.deleteByQuery as jest.Mock).mockRejectedValue(new Error('purge failed'));

      const result = await deleteWorkflows({
        ids: ['wf-1'],
        spaceId: 'default',
        force: true,
        storage,
        esClient,
        taskScheduler: null,
        logger,
        getWorkflowExecutions: noopExecutions,
      });

      expect(result.deleted).toBe(1);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to purge'));
    });
  });
});
