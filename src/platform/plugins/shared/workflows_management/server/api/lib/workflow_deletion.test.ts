/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import type {
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from '@kbn/workflows-execution-engine/server';

import { deleteWorkflows } from './workflow_deletion';
import type { WorkflowProperties } from '../../storage/workflow_storage';

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
      hits: {
        hits: hits.map((h) => ({ _id: h._id, _source: h._source, _seq_no: 7, _primary_term: 2 })),
      },
    }),
    bulk: jest
      .fn()
      .mockImplementation(
        async ({ operations }: { operations: Array<{ index: { _id: string } }> }) => ({
          items: operations.map((op) => ({
            index: { _id: op.index._id, status: 200, _seq_no: 8, _primary_term: 2 },
          })),
        })
      ),
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
    search: jest.fn().mockResolvedValue({
      took: 0,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { hits: [] },
    }),
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

  it('checks the stored access before any delete write', async () => {
    const { client, storage } = makeStorageClient([{ _id: 'wf-1', _source: makeWorkflowSource() }]);
    const assertCanDelete = jest.fn(() => {
      throw new Error('Access revoked');
    });
    await expect(
      deleteWorkflows({
        ids: ['wf-1'],
        spaceId: 'default',
        force: false,
        storage,
        ...makeExecutionsDataAccess(),
        taskScheduler: null,
        logger,
        getWorkflowExecutions: noopExecutions,
        assertCanDelete,
      })
    ).rejects.toThrow('Access revoked');
    expect(assertCanDelete).toHaveBeenCalledWith(expect.objectContaining({ name: 'Test' }), 'wf-1');
    expect(client.bulk).not.toHaveBeenCalled();
    expect(client.delete).not.toHaveBeenCalled();
  });

  it('requires confirmation before force deletion removes access controls', async () => {
    const { client, storage } = makeStorageClient([
      {
        _id: 'private-workflow',
        _source: makeWorkflowSource({ access_control: { access_mode: 'private', entries: [] } }),
      },
    ]);
    await expect(
      deleteWorkflows({
        ids: ['private-workflow'],
        spaceId: 'default',
        force: true,
        storage,
        ...makeExecutionsDataAccess(),
        taskScheduler: null,
        logger,
        getWorkflowExecutions: noopExecutions,
      })
    ).rejects.toThrow('Set acknowledgeAclLoss=true');
    expect(client.delete).not.toHaveBeenCalled();
    expect(client.bulk).not.toHaveBeenCalled();
  });

  it('force-deletes an ACL workflow after explicit confirmation', async () => {
    const { client, storage } = makeStorageClient([
      {
        _id: 'private-workflow',
        _source: makeWorkflowSource({ access_control: { access_mode: 'private', entries: [] } }),
      },
    ]);
    const dataClients = makeExecutionsDataAccess();
    const result = await deleteWorkflows({
      ids: ['private-workflow'],
      spaceId: 'default',
      force: true,
      acknowledgeAclLoss: true,
      storage,
      ...dataClients,
      taskScheduler: null,
      logger,
      getWorkflowExecutions: noopExecutions,
    });
    expect(result.deleted).toBe(1);
    expect(client.delete).toHaveBeenCalledWith(expect.objectContaining({ id: 'private-workflow' }));
    expect(
      jest.mocked(dataClients.stepExecutionsDataClient.deleteByQuery).mock.invocationCallOrder[0]
    ).toBeLessThan(
      jest.mocked(dataClients.workflowExecutionsDataClient.deleteByQuery).mock
        .invocationCallOrder[0]
    );
    expect(
      jest.mocked(dataClients.workflowExecutionsDataClient.deleteByQuery).mock
        .invocationCallOrder[0]
    ).toBeLessThan(client.delete.mock.invocationCallOrder[0]);
    expect(dataClients.stepExecutionsDataClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({ conflicts: 'abort' })
    );
  });

  it.each([true, false])(
    'does not purge after a concurrent access change (enabled=%s)',
    async (enabled) => {
      const { client, storage } = makeStorageClient([
        {
          _id: 'wf-1',
          _source: makeWorkflowSource({
            enabled,
            access_control: { access_mode: 'private', entries: [] },
          }),
        },
      ]);
      const dataClients = makeExecutionsDataAccess();
      client.bulk.mockResolvedValueOnce({ items: [{ index: { _id: 'wf-1', status: 409 } }] });
      await expect(
        deleteWorkflows({
          ids: ['wf-1'],
          spaceId: 'default',
          force: true,
          acknowledgeAclLoss: true,
          storage,
          ...dataClients,
          taskScheduler: null,
          logger,
          getWorkflowExecutions: noopExecutions,
        })
      ).rejects.toThrow('A workflow changed during deletion');
      expect(client.delete).not.toHaveBeenCalled();
      expect(dataClients.stepExecutionsDataClient.deleteByQuery).not.toHaveBeenCalled();
      expect(dataClients.workflowExecutionsDataClient.deleteByQuery).not.toHaveBeenCalled();
    }
  );

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
      expect(bulkOps[0].index).toMatchObject({ if_seq_no: 7, if_primary_term: 2 });
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
    it.each([undefined, { access_mode: 'public', entries: [] }])(
      'does not rewrite an already disabled public or legacy workflow (%j)',
      async (accessControl) => {
        const { client, storage } = makeStorageClient([
          {
            _id: 'wf-1',
            _source: makeWorkflowSource({ enabled: false, access_control: accessControl }),
          },
        ]);

        const result = await deleteWorkflows({
          ids: ['wf-1'],
          spaceId: 'default',
          force: true,
          storage,
          ...makeExecutionsDataAccess(),
          taskScheduler: null,
          logger,
          getWorkflowExecutions: noopExecutions,
        });

        expect(result.deleted).toBe(1);
        expect(client.bulk).not.toHaveBeenCalled();
        expect(client.delete).toHaveBeenCalledWith({
          id: 'wf-1',
          if_seq_no: 7,
          if_primary_term: 2,
        });
      }
    );

    it('does not purge public history if a concurrent ACL change prevents document deletion', async () => {
      const { client, storage } = makeStorageClient([
        { _id: 'wf-1', _source: makeWorkflowSource({ enabled: false }) },
      ]);
      client.delete.mockRejectedValueOnce(new Error('version conflict'));
      const dataClients = makeExecutionsDataAccess();

      const result = await deleteWorkflows({
        ids: ['wf-1'],
        spaceId: 'default',
        force: true,
        storage,
        ...dataClients,
        taskScheduler: null,
        logger,
        getWorkflowExecutions: noopExecutions,
      });

      expect(result).toEqual({
        total: 1,
        deleted: 0,
        failures: [{ id: 'wf-1', error: 'version conflict' }],
        successfulIds: [],
      });
      expect(client.delete).toHaveBeenCalledWith({ id: 'wf-1', if_seq_no: 7, if_primary_term: 2 });
      expect(dataClients.stepExecutionsDataClient.deleteByQuery).not.toHaveBeenCalled();
      expect(dataClients.workflowExecutionsDataClient.deleteByQuery).not.toHaveBeenCalled();
    });

    it('uses strict cleanup only for private workflows in a mixed batch', async () => {
      const { client, storage } = makeStorageClient([
        {
          _id: 'public',
          _source: makeWorkflowSource({ access_control: { access_mode: 'public', entries: [] } }),
        },
        {
          _id: 'private',
          _source: makeWorkflowSource({ access_control: { access_mode: 'private', entries: [] } }),
        },
        { _id: 'legacy', _source: makeWorkflowSource({ enabled: false }) },
        { _id: 'failed', _source: makeWorkflowSource() },
      ]);
      client.delete.mockImplementation(async ({ id }: { id: string }) => {
        if (id === 'failed') throw new Error('doc delete failed');
        return { result: 'deleted' };
      });
      const dataClients = makeExecutionsDataAccess();

      const result = await deleteWorkflows({
        ids: ['public', 'private', 'legacy', 'failed'],
        spaceId: 'default',
        force: true,
        acknowledgeAclLoss: true,
        storage,
        ...dataClients,
        taskScheduler: null,
        logger,
        getWorkflowExecutions: noopExecutions,
      });

      expect(result.successfulIds).toEqual(['public', 'private', 'legacy']);
      for (const dataClient of Object.values(dataClients)) {
        expect(dataClient.deleteByQuery).toHaveBeenNthCalledWith(1, {
          query: {
            bool: {
              must: [{ terms: { workflowId: ['private'] } }, { term: { spaceId: 'default' } }],
            },
          },
          refresh: true,
          conflicts: 'abort',
        });
        expect(dataClient.deleteByQuery).toHaveBeenNthCalledWith(2, {
          query: {
            bool: {
              must: [
                { terms: { workflowId: ['public', 'legacy'] } },
                { term: { spaceId: 'default' } },
              ],
            },
          },
          refresh: true,
          conflicts: 'proceed',
        });
        expect(jest.mocked(dataClient.deleteByQuery).mock.invocationCallOrder[0]).toBeLessThan(
          client.delete.mock.invocationCallOrder[0]
        );
        expect(jest.mocked(dataClient.deleteByQuery).mock.invocationCallOrder[1]).toBeGreaterThan(
          client.delete.mock.invocationCallOrder[3]
        );
      }
    });

    it('restores public workflows when private cleanup fails in a mixed batch', async () => {
      const publicWorkflow = makeWorkflowSource({
        access_control: { access_mode: 'public', entries: [] },
      });
      const { client, storage } = makeStorageClient([
        { _id: 'public', _source: publicWorkflow },
        {
          _id: 'private',
          _source: makeWorkflowSource({ access_control: { access_mode: 'private', entries: [] } }),
        },
      ]);
      const dataClients = makeExecutionsDataAccess();
      jest
        .mocked(dataClients.stepExecutionsDataClient.deleteByQuery)
        .mockRejectedValueOnce(new Error('purge failed'));

      await expect(
        deleteWorkflows({
          ids: ['public', 'private'],
          spaceId: 'default',
          force: true,
          acknowledgeAclLoss: true,
          storage,
          ...dataClients,
          taskScheduler: null,
          logger,
          getWorkflowExecutions: noopExecutions,
        })
      ).rejects.toThrow('Private workflows remain soft-deleted and disabled');

      expect(client.delete).not.toHaveBeenCalled();
      expect(client.bulk).toHaveBeenCalledTimes(2);
      expect(client.bulk.mock.calls[1][0].operations).toEqual([
        { index: { _id: 'public', if_seq_no: 8, if_primary_term: 2, document: publicWorkflow } },
      ]);
      expect(dataClients.workflowExecutionsDataClient.deleteByQuery).not.toHaveBeenCalled();
    });

    it.each([undefined, { access_mode: 'public', entries: [] }])(
      'deletes public or legacy documents before history without acknowledgment (%j)',
      async (accessControl) => {
        const { client, storage } = makeStorageClient([
          { _id: 'wf-1', _source: makeWorkflowSource({ access_control: accessControl }) },
        ]);
        const { workflowExecutionsDataClient, stepExecutionsDataClient } =
          makeExecutionsDataAccess();

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

        expect(client.delete.mock.invocationCallOrder[0]).toBeLessThan(
          jest.mocked(workflowExecutionsDataClient.deleteByQuery).mock.invocationCallOrder[0]
        );
        expect(client.delete.mock.invocationCallOrder[0]).toBeLessThan(
          jest.mocked(stepExecutionsDataClient.deleteByQuery).mock.invocationCallOrder[0]
        );
        expect(client.bulk.mock.calls[0][0].operations[0].index.document).toMatchObject({
          enabled: false,
          deleted_at: null,
        });
        expect(result.deleted).toBe(1);
        expect(result.successfulIds).toEqual(['wf-1']);
        expect(client.delete).toHaveBeenCalledWith({
          id: 'wf-1',
          if_seq_no: 8,
          if_primary_term: 2,
        });
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
      }
    );

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
      expect(workflowExecutionsDataClient.deleteByQuery).not.toHaveBeenCalled();
      expect(stepExecutionsDataClient.deleteByQuery).not.toHaveBeenCalled();
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

    describe.each(['steps', 'executions'] as const)('%s cleanup', (target) => {
      const cleanupFailures = [
        ['request error', new Error('purge failed'), 'purge failed'],
        ['timeout', { timed_out: true }, 'timed_out=true'],
        ['version conflict', { version_conflicts: 1 }, 'version_conflicts=1'],
        [
          'partial failure',
          {
            failures: [
              {
                id: 'execution-1',
                index: 'history',
                status: 500,
                cause: { type: 'exception', reason: 'shard failed' },
              },
            ],
          },
          'failures=1',
        ],
      ] satisfies Array<
        [string, Error | Awaited<ReturnType<WorkflowExecutionsDataClient['deleteByQuery']>>, string]
      >;

      it.each(cleanupFailures)('retains the workflow ACL on %s', async (_, response, message) => {
        const { client, storage } = makeStorageClient([
          {
            _id: 'wf-1',
            _source: makeWorkflowSource({
              owner_id: 'owner',
              access_control: { access_mode: 'private', entries: [] },
            }),
          },
        ]);
        const dataClients = makeExecutionsDataAccess();
        const deleteByQuery = jest.mocked(
          target === 'steps'
            ? dataClients.stepExecutionsDataClient.deleteByQuery
            : dataClients.workflowExecutionsDataClient.deleteByQuery
        );
        if (response instanceof Error) {
          deleteByQuery.mockRejectedValueOnce(response);
        } else {
          deleteByQuery.mockResolvedValueOnce(response);
        }

        await expect(
          deleteWorkflows({
            ids: ['wf-1'],
            spaceId: 'default',
            force: true,
            acknowledgeAclLoss: true,
            storage,
            ...dataClients,
            taskScheduler: null,
            logger,
            getWorkflowExecutions: noopExecutions,
          })
        ).rejects.toThrow(message);

        expect(client.delete).not.toHaveBeenCalled();
        expect(client.bulk).toHaveBeenCalledTimes(1);
        expect(client.bulk.mock.calls[0][0].operations[0].index.document).toMatchObject({
          enabled: false,
          deleted_at: expect.any(Date),
          owner_id: 'owner',
          access_control: { access_mode: 'private', entries: [] },
        });
        if (target === 'steps') {
          expect(dataClients.workflowExecutionsDataClient.deleteByQuery).not.toHaveBeenCalled();
        }
      });

      it.each(cleanupFailures)(
        'keeps public and legacy deletion successful on %s',
        async (_, response, message) => {
          for (const accessControl of [undefined, { access_mode: 'public', entries: [] }]) {
            const { client, storage } = makeStorageClient([
              { _id: 'wf-1', _source: makeWorkflowSource({ access_control: accessControl }) },
            ]);
            const dataClients = makeExecutionsDataAccess();
            const deleteByQuery = jest.mocked(
              target === 'steps'
                ? dataClients.stepExecutionsDataClient.deleteByQuery
                : dataClients.workflowExecutionsDataClient.deleteByQuery
            );
            if (response instanceof Error) {
              deleteByQuery.mockRejectedValueOnce(response);
            } else {
              deleteByQuery.mockResolvedValueOnce(response);
            }

            const result = await deleteWorkflows({
              ids: ['wf-1'],
              spaceId: 'default',
              force: true,
              storage,
              ...dataClients,
              taskScheduler: null,
              logger,
              getWorkflowExecutions: noopExecutions,
            });

            expect(result).toEqual({ total: 1, deleted: 1, successfulIds: ['wf-1'], failures: [] });
            expect(client.delete).toHaveBeenCalledTimes(1);
            expect(dataClients.stepExecutionsDataClient.deleteByQuery).toHaveBeenCalledTimes(1);
            expect(dataClients.workflowExecutionsDataClient.deleteByQuery).toHaveBeenCalledTimes(1);
            if (response instanceof Error) {
              expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(message));
            }
          }
        }
      );
    });
  });
});

describe('bound workflow deletion OCC', () => {
  const setup = (force: boolean, privateWorkflow = false) => {
    const document: WorkflowProperties = makeWorkflowSource(
      privateWorkflow
        ? { owner_id: 'owner', access_control: { access_mode: 'private', entries: [] } }
        : {}
    );
    const { client, storage } = makeStorageClient([]);
    const deleteDocument = jest.fn().mockResolvedValue(undefined);
    const params = {
      ids: ['bound'],
      spaceId: 'default',
      force,
      acknowledgeAclLoss: privateWorkflow,
      storage,
      ...makeExecutionsDataAccess(),
      taskScheduler: null,
      logger,
      getWorkflowExecutions: jest.fn().mockResolvedValue({ total: 0, results: [] }),
      guardedDelete: { id: 'bound', document, seqNo: 7, primaryTerm: 1, deleteDocument },
    };
    return { client, params, deleteDocument };
  };

  it.each([false, true])('checks ACLs before a guarded delete (force: %s)', async (force) => {
    const { client, params, deleteDocument } = setup(force, true);
    await expect(
      deleteWorkflows({
        ...params,
        assertCanDelete: () => {
          throw new Error('Access revoked');
        },
      })
    ).rejects.toThrow('Access revoked');
    expect(client.index).not.toHaveBeenCalled();
    expect(deleteDocument).not.toHaveBeenCalled();
    expect(params.stepExecutionsDataClient.deleteByQuery).not.toHaveBeenCalled();
  });

  it('requires confirmation before deleting a private guarded workflow', async () => {
    const { client, params } = setup(true, true);
    await expect(deleteWorkflows({ ...params, acknowledgeAclLoss: false })).rejects.toThrow(
      'acknowledgeAclLoss'
    );
    expect(client.index).not.toHaveBeenCalled();
  });

  it('removes private history before deleting the guarded workflow document', async () => {
    const { params, deleteDocument } = setup(true, true);
    const calls: string[] = [];
    jest.mocked(params.stepExecutionsDataClient.deleteByQuery).mockImplementationOnce(async () => {
      calls.push('steps');
      return { deleted: 1 };
    });
    jest
      .mocked(params.workflowExecutionsDataClient.deleteByQuery)
      .mockImplementationOnce(async () => {
        calls.push('executions');
        return { deleted: 1 };
      });
    deleteDocument.mockImplementationOnce(async () => {
      calls.push('workflow');
    });
    await expect(deleteWorkflows(params)).resolves.toMatchObject({ deleted: 1 });
    expect(calls).toEqual(['steps', 'executions', 'workflow']);
  });

  it.each(['steps', 'executions'] as const)(
    'retains the private guarded workflow ACL when %s cleanup is incomplete',
    async (target) => {
      const { client, params, deleteDocument } = setup(true, true);
      const dataClient =
        target === 'steps' ? params.stepExecutionsDataClient : params.workflowExecutionsDataClient;
      jest.mocked(dataClient.deleteByQuery).mockResolvedValueOnce({ version_conflicts: 1 });

      await expect(deleteWorkflows(params)).rejects.toThrow('remains soft-deleted');
      expect(deleteDocument).not.toHaveBeenCalled();
      expect(client.index).toHaveBeenCalledTimes(1);
      expect(client.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            enabled: false,
            deleted_at: expect.any(Date),
            access_control: { access_mode: 'private', entries: [] },
          }),
        })
      );
    }
  );

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

  it('blocks deleting a global managed workflow with executions in any space', async () => {
    const { client, params, deleteDocument } = setup(true);
    params.spaceId = '*';
    params.guardedDelete.document.spaceId = '*';
    params.guardedDelete.document.managed = true;
    jest.mocked(params.workflowExecutionsDataClient.search).mockResolvedValueOnce({
      took: 0,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { hits: [{ _index: 'executions', _id: 'running-child-in-concrete-space' }] },
    });
    await expect(deleteWorkflows(params)).rejects.toThrow('running executions');
    expect(params.getWorkflowExecutions).not.toHaveBeenCalled();
    expect(params.workflowExecutionsDataClient.search).toHaveBeenCalledWith({
      query: {
        bool: {
          filter: [
            { term: { workflowId: 'bound' } },
            { terms: { status: [...NonTerminalExecutionStatuses] } },
          ],
        },
      },
      size: 1,
      _source: false,
      allow_partial_search_results: false,
    });
    expect(deleteDocument).not.toHaveBeenCalled();
    expect(client.index).toHaveBeenLastCalledWith(
      expect.objectContaining({
        document: params.guardedDelete.document,
      })
    );
  });

  it('fails closed and restores the global definition when execution lookup fails', async () => {
    const { client, params, deleteDocument } = setup(true);
    params.spaceId = '*';
    params.guardedDelete.document.spaceId = '*';
    params.guardedDelete.document.managed = true;
    jest
      .mocked(params.workflowExecutionsDataClient.search)
      .mockRejectedValueOnce(new Error('unavailable'));
    await expect(deleteWorkflows(params)).rejects.toThrow('unavailable');
    expect(deleteDocument).not.toHaveBeenCalled();
    expect(client.index).toHaveBeenCalledTimes(2);
  });

  it.each([
    { timed_out: true, failed: 0 },
    { timed_out: false, failed: 1 },
  ])('rejects an incomplete global execution search (%j)', async ({ timed_out, failed }) => {
    const { client, params, deleteDocument } = setup(true);
    params.spaceId = '*';
    params.guardedDelete.document.spaceId = '*';
    params.guardedDelete.document.managed = true;
    jest.mocked(params.workflowExecutionsDataClient.search).mockResolvedValueOnce({
      took: 0,
      timed_out,
      _shards: { total: 1, successful: 1 - failed, skipped: 0, failed },
      hits: { hits: [] },
    });
    await expect(deleteWorkflows(params)).rejects.toThrow('active execution search was incomplete');
    expect(deleteDocument).not.toHaveBeenCalled();
    expect(params.workflowExecutionsDataClient.deleteByQuery).not.toHaveBeenCalled();
    expect(client.index).toHaveBeenLastCalledWith(
      expect.objectContaining({ document: params.guardedDelete.document })
    );
  });

  it('deletes a global managed workflow after all executions finish', async () => {
    const { params, deleteDocument } = setup(true);
    params.spaceId = '*';
    params.guardedDelete.document.spaceId = '*';
    params.guardedDelete.document.managed = true;
    await expect(deleteWorkflows(params)).resolves.toMatchObject({ deleted: 1 });
    expect(deleteDocument).toHaveBeenCalled();
  });

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
