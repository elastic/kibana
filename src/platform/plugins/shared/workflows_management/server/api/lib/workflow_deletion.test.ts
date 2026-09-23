/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import type {
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from '@kbn/workflows-execution-engine/server';

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
    index: jest.fn().mockResolvedValue({ _seq_no: 8, _primary_term: 1 }),
  };
  return {
    client: mockClient,
    storage: { getClient: () => mockClient } as any,
  };
};

const makeExecutionsDataAccess = () => {
  const workflowExecutionsDataClient = {
    deleteByQuery: jest.fn().mockResolvedValue({ deleted: 0 }),
  } as unknown as WorkflowExecutionsDataClient;
  const stepExecutionsDataClient = {
    deleteByQuery: jest.fn().mockResolvedValue({ deleted: 0 }),
  } as unknown as StepExecutionsDataClient;

  return { workflowExecutionsDataClient, stepExecutionsDataClient };
};

const noopExecutions = jest.fn().mockResolvedValue({ total: 0, results: [] });

describe('deleteWorkflows', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('soft delete', () => {
    it('marks workflows as deleted and disabled', async () => {
      const { client, storage } = makeStorageClient([
        { _id: 'wf-1', _source: makeWorkflowSource() },
      ]);
      const { workflowExecutionsDataClient, stepExecutionsDataClient } = makeExecutionsDataAccess();

      const result = await deleteWorkflows({
        ids: ['wf-1'],
        spaceId: 'default',
        force: false,
        storage,
        workflowExecutionsDataClient,
        stepExecutionsDataClient,
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
      const { workflowExecutionsDataClient, stepExecutionsDataClient } = makeExecutionsDataAccess();

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
        workflowExecutionsDataClient,
        stepExecutionsDataClient,
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
      const { workflowExecutionsDataClient, stepExecutionsDataClient } = makeExecutionsDataAccess();

      const result = await deleteWorkflows({
        ids: ['wf-missing'],
        spaceId: 'default',
        force: false,
        storage,
        workflowExecutionsDataClient,
        stepExecutionsDataClient,
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
      const { workflowExecutionsDataClient, stepExecutionsDataClient } = makeExecutionsDataAccess();

      const result = await deleteWorkflows({
        ids: ['wf-1', 'wf-missing'],
        spaceId: 'default',
        force: false,
        storage,
        workflowExecutionsDataClient,
        stepExecutionsDataClient,
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
      const { workflowExecutionsDataClient, stepExecutionsDataClient } = makeExecutionsDataAccess();

      const result = await deleteWorkflows({
        ids: ['wf-1'],
        spaceId: 'default',
        force: true,
        storage,
        workflowExecutionsDataClient,
        stepExecutionsDataClient,
        taskScheduler: null,
        logger,
        getWorkflowExecutions: noopExecutions,
      });

      expect(result.deleted).toBe(1);
      expect(result.successfulIds).toEqual(['wf-1']);
      expect(client.delete).toHaveBeenCalledWith({ id: 'wf-1' });
      expect(workflowExecutionsDataClient.deleteByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              must: [{ terms: { workflowId: ['wf-1'] } }, { term: { spaceId: 'default' } }],
            },
          },
          refresh: true,
          conflicts: 'proceed',
        })
      );
      expect(stepExecutionsDataClient.deleteByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              must: [{ terms: { workflowId: ['wf-1'] } }, { term: { spaceId: 'default' } }],
            },
          },
        })
      );
    });

    it('throws when workflows have running executions', async () => {
      const { client, storage } = makeStorageClient([
        { _id: 'wf-1', _source: makeWorkflowSource() },
      ]);
      const { workflowExecutionsDataClient, stepExecutionsDataClient } = makeExecutionsDataAccess();
      const getWorkflowExecutions = jest.fn().mockResolvedValue({ total: 1, results: [{}] });
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
          workflowExecutionsDataClient,
          stepExecutionsDataClient,
          taskScheduler: null,
          logger,
          getWorkflowExecutions,
        })
      ).rejects.toThrow('Cannot force-delete workflows with running executions');

      expect(client.bulk).toHaveBeenCalledTimes(2);
      expect(client.delete).not.toHaveBeenCalled();
    });

    it('collects failures when individual document deletion fails', async () => {
      const { client, storage } = makeStorageClient([
        { _id: 'wf-1', _source: makeWorkflowSource() },
      ]);
      const { workflowExecutionsDataClient, stepExecutionsDataClient } = makeExecutionsDataAccess();
      client.delete.mockRejectedValue(new Error('doc delete failed'));

      const result = await deleteWorkflows({
        ids: ['wf-1'],
        spaceId: 'default',
        force: true,
        storage,
        workflowExecutionsDataClient,
        stepExecutionsDataClient,
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
      const { workflowExecutionsDataClient, stepExecutionsDataClient } = makeExecutionsDataAccess();
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
          workflowExecutionsDataClient,
          stepExecutionsDataClient,
          taskScheduler: null,
          logger,
          getWorkflowExecutions,
        })
      ).rejects.toThrow('execution lookup failed');

      expect(client.bulk).toHaveBeenCalledTimes(2);
      expect(client.delete).not.toHaveBeenCalled();
    });

    it('logs warning but does not throw when purge fails', async () => {
      const { storage } = makeStorageClient([{ _id: 'wf-1', _source: makeWorkflowSource() }]);
      const { workflowExecutionsDataClient, stepExecutionsDataClient } = makeExecutionsDataAccess();
      (workflowExecutionsDataClient.deleteByQuery as jest.Mock).mockRejectedValue(
        new Error('purge failed')
      );

      const result = await deleteWorkflows({
        ids: ['wf-1'],
        spaceId: 'default',
        force: true,
        storage,
        workflowExecutionsDataClient,
        stepExecutionsDataClient,
        taskScheduler: null,
        logger,
        getWorkflowExecutions: noopExecutions,
      });

      expect(result.deleted).toBe(1);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to purge'));
    });
  });
});

describe('bound workflow deletion OCC', () => {
  const setup = (force: boolean) => {
    const document = makeWorkflowSource();
    const { client, storage } = makeStorageClient([]);
    const deleteDocument = jest.fn().mockResolvedValue(undefined);
    const params = {
      ids: ['bound'],
      spaceId: 'default',
      force,
      storage,
      ...makeExecutionsDataAccess(),
      taskScheduler: null,
      logger,
      getWorkflowExecutions: jest.fn().mockResolvedValue({ total: 0, results: [] }),
      guardedDelete: { id: 'bound', document, seqNo: 7, primaryTerm: 1, deleteDocument },
    };
    return { client, params, deleteDocument };
  };

  it.each([false, true])(
    'does not delete a concurrently changed definition (force: %s)',
    async (force) => {
      const { client, params, deleteDocument } = setup(force);
      const conflict = new Error('version conflict');
      client.index.mockRejectedValueOnce(conflict);
      await expect(deleteWorkflows(params)).rejects.toBe(conflict);
      expect(client.index).toHaveBeenCalledWith(
        expect.objectContaining({ if_seq_no: 7, if_primary_term: 1 })
      );
      expect(deleteDocument).not.toHaveBeenCalled();
      expect(params.workflowExecutionsDataClient.deleteByQuery).not.toHaveBeenCalled();
    }
  );

  it('hard-deletes only the revision it disabled', async () => {
    const { params, deleteDocument } = setup(true);
    await expect(deleteWorkflows(params)).resolves.toMatchObject({ deleted: 1 });
    expect(deleteDocument).toHaveBeenCalledWith(8, 1);
  });

  it('does not overwrite an update that wins after disabling', async () => {
    const { client, params, deleteDocument } = setup(true);
    const conflict = new Error('concurrent update won');
    deleteDocument.mockRejectedValue(conflict);
    client.index
      .mockResolvedValueOnce({ _seq_no: 8, _primary_term: 1 })
      .mockRejectedValueOnce(conflict);
    await expect(deleteWorkflows(params)).rejects.toBe(conflict);
    expect(client.index).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ if_seq_no: 8, if_primary_term: 1 })
    );
    expect(params.workflowExecutionsDataClient.deleteByQuery).not.toHaveBeenCalled();
  });

  it('checks executions again after disabling and restores with OCC', async () => {
    const { client, params, deleteDocument } = setup(true);
    params.getWorkflowExecutions.mockResolvedValue({ total: 1, results: [] });
    await expect(deleteWorkflows(params)).rejects.toThrow('running executions');
    expect(deleteDocument).not.toHaveBeenCalled();
    expect(client.index).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        if_seq_no: 8,
        if_primary_term: 1,
        document: expect.objectContaining({ enabled: true }),
      })
    );
  });
});
