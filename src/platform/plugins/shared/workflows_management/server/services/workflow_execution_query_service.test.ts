/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { ExecutionType } from '@kbn/workflows';
import type { IWorkflowEventLoggerService } from '@kbn/workflows-execution-engine/server';

import { WorkflowExecutionQueryService } from './workflow_execution_query_service';
import { WORKFLOWS_INDEX, WORKFLOWS_STEP_EXECUTIONS_INDEX } from '../../common';

describe('WorkflowExecutionQueryService', () => {
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockLogger: ReturnType<typeof loggerMock.create>;
  let mockEventLoggerService: jest.Mocked<IWorkflowEventLoggerService>;
  let service: WorkflowExecutionQueryService;

  beforeEach(() => {
    mockEsClient = {
      search: jest.fn(),
      get: jest.fn(),
      mget: jest.fn(),
    } as any;
    mockLogger = loggerMock.create();
    mockEventLoggerService = {
      getExecutionLogs: jest.fn().mockResolvedValue({ results: [], total: 0 }),
      getStepLogs: jest.fn().mockResolvedValue({ results: [], total: 0 }),
    } as any;

    service = new WorkflowExecutionQueryService({
      logger: mockLogger,
      esClient: mockEsClient,
      workflowEventLoggerService: mockEventLoggerService,
    });
  });

  describe('getWorkflowExecutions', () => {
    const emptyResponse = { hits: { hits: [], total: { value: 0 } } };

    it('builds query with workflowId and spaceId filter', async () => {
      mockEsClient.search.mockResolvedValue(emptyResponse as any);

      await service.getWorkflowExecutions({ workflowId: 'wf-1' }, 'my-space');

      const call = mockEsClient.search.mock.calls[0][0] as any;
      const must = call.query.bool.must;
      expect(must[0]).toEqual({ term: { workflowId: 'wf-1' } });
      // spaceId with backward compat should clause
      expect(must[1].bool.should).toHaveLength(2);
      expect(must[1].bool.should[0]).toEqual({ term: { spaceId: 'my-space' } });
    });

    it('adds status filter when statuses provided', async () => {
      mockEsClient.search.mockResolvedValue(emptyResponse as any);

      await service.getWorkflowExecutions(
        { workflowId: 'wf-1', statuses: ['completed', 'failed'] as any },
        'default'
      );

      const call = mockEsClient.search.mock.calls[0][0] as any;
      const must = call.query.bool.must;
      expect(must).toContainEqual({ terms: { status: ['completed', 'failed'] } });
    });

    it('adds isTestRun filter for test execution type', async () => {
      mockEsClient.search.mockResolvedValue(emptyResponse as any);

      await service.getWorkflowExecutions(
        { workflowId: 'wf-1', executionTypes: [ExecutionType.TEST] },
        'default'
      );

      const call = mockEsClient.search.mock.calls[0][0] as any;
      const must = call.query.bool.must;
      expect(must).toContainEqual({ term: { isTestRun: true } });
    });

    it('adds non-test-run filter for production execution type', async () => {
      mockEsClient.search.mockResolvedValue(emptyResponse as any);

      await service.getWorkflowExecutions(
        { workflowId: 'wf-1', executionTypes: [ExecutionType.PRODUCTION] },
        'default'
      );

      const call = mockEsClient.search.mock.calls[0][0] as any;
      const must = call.query.bool.must;
      // Should include both false and not-exists for backward compat
      const isTestRunFilter = must.find(
        (clause: any) => clause.bool?.should?.[0]?.term?.isTestRun === false
      );
      expect(isTestRunFilter).toBeDefined();
      expect(isTestRunFilter.bool.should).toHaveLength(2);
    });

    it('adds executedBy filter', async () => {
      mockEsClient.search.mockResolvedValue(emptyResponse as any);

      await service.getWorkflowExecutions(
        { workflowId: 'wf-1', executedBy: ['user1', 'user2'] },
        'default'
      );

      const call = mockEsClient.search.mock.calls[0][0] as any;
      const must = call.query.bool.must;
      expect(must).toContainEqual({ terms: { executedBy: ['user1', 'user2'] } });
    });

    it('adds omitStepRuns filter', async () => {
      mockEsClient.search.mockResolvedValue(emptyResponse as any);

      await service.getWorkflowExecutions({ workflowId: 'wf-1', omitStepRuns: true }, 'default');

      const call = mockEsClient.search.mock.calls[0][0] as any;
      const must = call.query.bool.must;
      const stepIdFilter = must.find(
        (clause: any) => clause.bool?.must_not?.exists?.field === 'stepId'
      );
      expect(stepIdFilter).toBeDefined();
    });

    it('uses default page size and page 1 when not specified', async () => {
      mockEsClient.search.mockResolvedValue(emptyResponse as any);

      await service.getWorkflowExecutions({ workflowId: 'wf-1' }, 'default');

      const call = mockEsClient.search.mock.calls[0][0] as any;
      expect(call.size).toBe(100);
      expect(call.from).toBe(0);
    });

    it('calculates correct offset for page 3 with size 20', async () => {
      mockEsClient.search.mockResolvedValue(emptyResponse as any);

      await service.getWorkflowExecutions({ workflowId: 'wf-1', page: 3, size: 20 }, 'default');

      const call = mockEsClient.search.mock.calls[0][0] as any;
      expect(call.size).toBe(20);
      expect(call.from).toBe(40);
    });
  });

  describe('getWorkflowExecutionHistory', () => {
    it('queries step executions by executionId and spaceId', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } } as any);

      await service.getWorkflowExecutionHistory('exec-1', 'default');

      const call = mockEsClient.search.mock.calls[0][0] as any;
      expect(call.index).toBe('.workflows-step-executions');
      expect(call.query.bool.must).toContainEqual({ term: { executionId: 'exec-1' } });
      expect(call.query.bool.must).toContainEqual({ term: { spaceId: 'default' } });
      expect(call.sort).toEqual([{ timestamp: { order: 'asc' } }]);
    });

    it('calculates duration from startedAt and finishedAt', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                stepId: 'step-1',
                status: 'completed',
                startedAt: '2024-01-01T10:00:00.000Z',
                finishedAt: '2024-01-01T10:00:05.000Z',
              },
            },
          ],
        },
      } as any);

      const result = await service.getWorkflowExecutionHistory('exec-1', 'default');

      expect(result).toHaveLength(1);
      expect(result[0].duration).toBe(5000);
      expect(result[0].finishedAt).toBe('2024-01-01T10:00:05.000Z');
    });

    it('handles endedAt as alias for finishedAt (backward compat)', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                stepId: 'step-1',
                status: 'completed',
                startedAt: '2024-01-01T10:00:00.000Z',
                endedAt: '2024-01-01T10:00:03.000Z',
              },
            },
          ],
        },
      } as any);

      const result = await service.getWorkflowExecutionHistory('exec-1', 'default');

      expect(result[0].duration).toBe(3000);
      expect(result[0].finishedAt).toBe('2024-01-01T10:00:03.000Z');
    });

    it('sets duration to 0 when no finish timestamp', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                stepId: 'step-1',
                status: 'running',
                startedAt: '2024-01-01T10:00:00.000Z',
              },
            },
          ],
        },
      } as any);

      const result = await service.getWorkflowExecutionHistory('exec-1', 'default');

      expect(result[0].duration).toBe(0);
      expect(result[0].finishedAt).toBe('');
    });

    it('throws when hit has no _source', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [{ _id: 'bad' }] },
      } as any);

      await expect(service.getWorkflowExecutionHistory('exec-1', 'default')).rejects.toThrow(
        'Missing _source in search result'
      );
    });
  });

  describe('searchStepExecutions', () => {
    it('excludes input and output when not requested', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [], total: { value: 0 } } } as any);

      await service.searchStepExecutions(
        { workflowId: 'wf-1', includeInput: false, includeOutput: false },
        'default'
      );

      const call = mockEsClient.search.mock.calls[0][0] as any;
      expect(call._source?.excludes ?? call.source_excludes).toEqual(
        expect.arrayContaining(['input', 'output'])
      );
    });

    it('does not exclude when includeInput and includeOutput are true', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [], total: { value: 0 } } } as any);

      await service.searchStepExecutions(
        { workflowId: 'wf-1', includeInput: true, includeOutput: true },
        'default'
      );

      const call = mockEsClient.search.mock.calls[0][0] as any;
      // No source excludes should be passed
      expect(call._source?.excludes).toBeUndefined();
    });
  });

  describe('getStepExecution', () => {
    it('returns null when no step found', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } } as any);

      const result = await service.getStepExecution(
        { executionId: 'exec-1', id: 'step-1' },
        'default'
      );

      expect(result).toBeNull();
    });

    it('returns the step execution when found', async () => {
      const stepSource = {
        id: 'step-1',
        workflowRunId: 'exec-1',
        status: 'completed',
        spaceId: 'default',
      };
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [{ _source: stepSource }] },
      } as any);

      const result = await service.getStepExecution(
        { executionId: 'exec-1', id: 'step-1' },
        'default'
      );

      expect(result).toEqual(stepSource);
    });

    it('returns null when hit has undefined _source', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [{ _id: 'some-id' }] },
      } as any);

      const result = await service.getStepExecution(
        { executionId: 'exec-1', id: 'step-1' },
        'default'
      );

      expect(result).toBeNull();
    });

    it('queries by workflowRunId, id, and spaceId', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } } as any);

      await service.getStepExecution({ executionId: 'exec-1', id: 'step-1' }, 'my-space');

      const call = mockEsClient.search.mock.calls[0][0] as any;
      expect(call.query.bool.must).toContainEqual({ term: { workflowRunId: 'exec-1' } });
      expect(call.query.bool.must).toContainEqual({ term: { id: 'step-1' } });
      expect(call.query.bool.must).toContainEqual({ term: { spaceId: 'my-space' } });
    });
  });

  describe('getExecutionLogs', () => {
    it('delegates to workflowEventLoggerService', async () => {
      const params = { executionId: 'exec-1', spaceId: 'default' } as any;

      await service.getExecutionLogs(params);

      expect(mockEventLoggerService.getExecutionLogs).toHaveBeenCalledWith(params);
    });
  });

  describe('getStepLogs', () => {
    it('delegates to workflowEventLoggerService', async () => {
      const params = { executionId: 'exec-1', stepId: 'step-1', spaceId: 'default' } as any;

      await service.getStepLogs(params);

      expect(mockEventLoggerService.getStepLogs).toHaveBeenCalledWith(params);
    });
  });

  describe('listWaitingForInputSteps', () => {
    // Regression coverage for the Inbox <-> Workflows integration.
    //
    // The .workflows-step-executions index only indexes `spaceId` and
    // `status` as keyword fields; `stepType` lives in `_source` only. An
    // earlier draft included a `term: { stepType: 'waitForInput' }` filter
    // here, which silently matched zero docs and caused the Inbox UI to
    // appear empty even when workflows were paused on `waitForInput`. These
    // tests pin the wire-level query so a future refactor can't reintroduce
    // an unindexed filter without going red.
    const buildHit = (overrides: Record<string, unknown> = {}) => ({
      _id: 'doc-1',
      _source: {
        id: 'doc-1',
        stepId: 'ask',
        stepType: 'waitForInput',
        status: 'waiting_for_input',
        spaceId: 'default',
        workflowId: 'wf-1',
        workflowRunId: 'run-1',
        startedAt: '2026-04-28T15:00:00.000Z',
        globalExecutionIndex: 0,
        stepExecutionIndex: 0,
        topologicalIndex: 0,
        scopeStack: [],
        isTestRun: false,
        ...overrides,
      },
    });

    /**
     * Helper that mocks the parent-workflow alive-check lookup. The service
     * issues a second `.workflows-workflows` search after the step executions
     * search to filter out orphaned docs whose parent has been soft-deleted.
     */
    const mockAliveWorkflowsLookup = (aliveIds: string[]) => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          hits: aliveIds.map((id) => ({ _id: id })),
          total: { value: aliveIds.length },
        },
      } as any);
    };

    it('issues a term-only query against keyword-indexed fields and omits stepType', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: { hits: [buildHit()], total: { value: 1 } },
      } as any);
      mockAliveWorkflowsLookup(['wf-1']);

      const result = await service.listWaitingForInputSteps('default');

      expect(mockEsClient.search).toHaveBeenCalledTimes(2);
      const searchArgs = mockEsClient.search.mock.calls[0][0] as {
        index: string;
        query: {
          bool: {
            must: Array<Record<string, unknown>>;
            must_not?: Array<Record<string, unknown>>;
          };
        };
      };
      expect(searchArgs.index).toBe(WORKFLOWS_STEP_EXECUTIONS_INDEX);

      const must = searchArgs.query.bool.must;
      expect(must).toEqual(
        expect.arrayContaining([
          { term: { spaceId: 'default' } },
          { term: { status: 'waiting_for_input' } },
        ])
      );
      expect(must).toHaveLength(2);
      const filterFields = must.flatMap((clause) =>
        Object.keys(clause.term as Record<string, unknown>)
      );
      expect(filterFields).not.toContain('stepType');

      expect(result.total).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].stepType).toBe('waitForInput');
    });

    it('excludes step executions that already have finishedAt set', async () => {
      // Regression: a race between the workflow-level timeout monitor and the
      // waitForInput step could leave a doc with `status: waiting_for_input`
      // AND `finishedAt` set (the step is actually terminal). Such docs must
      // not resurface in the Inbox — responding to them is a no-op because the
      // parent workflow execution is already finished.
      mockEsClient.search.mockResolvedValueOnce({
        hits: { hits: [], total: { value: 0 } },
      } as any);

      await service.listWaitingForInputSteps('default');

      const searchArgs = mockEsClient.search.mock.calls[0][0] as {
        query: { bool: { must_not?: Array<Record<string, unknown>> } };
      };
      expect(searchArgs.query.bool.must_not).toEqual([{ exists: { field: 'finishedAt' } }]);
    });

    it('paginates via from/size derived from page/perPage', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: { hits: [], total: { value: 0 } },
      } as any);

      await service.listWaitingForInputSteps('default', { page: 3, perPage: 25 });

      const searchArgs = mockEsClient.search.mock.calls[0][0] as { from: number; size: number };
      expect(searchArgs.size).toBe(25);
      expect(searchArgs.from).toBe(50);
    });

    it('swallows index_not_found_exception with an empty result (cold install case)', async () => {
      mockEsClient.search.mockRejectedValueOnce(
        new errors.ResponseError({
          statusCode: 404,
          body: { error: { type: 'index_not_found_exception' } },
          headers: {},
          meta: {} as any,
          warnings: [],
        })
      );

      const result = await service.listWaitingForInputSteps('default');

      expect(result).toEqual({ results: [], total: 0 });
    });

    it('logs and rethrows for any other ES failure', async () => {
      mockEsClient.search.mockRejectedValueOnce(new Error('boom'));

      await expect(service.listWaitingForInputSteps('default')).rejects.toThrow('boom');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to list waiting-for-input step executions')
      );
    });

    // Orphan-filtering regressions — soft-deleted workflows leave their step
    // execution docs behind in `.workflows-step-executions` (see
    // `workflow_deletion.ts` — only hard-deletes call deleteByQuery against
    // that index). Without these the Inbox surfaces ghost actions for
    // workflows the user has already removed from `/app/workflows`.
    describe('orphan filtering (soft-deleted parent workflows)', () => {
      it('drops step executions whose parent workflow is soft-deleted and adjusts total', async () => {
        mockEsClient.search.mockResolvedValueOnce({
          hits: {
            hits: [
              buildHit({ id: 'doc-1', workflowId: 'wf-alive' }),
              buildHit({ id: 'doc-2', workflowId: 'wf-deleted' }),
              buildHit({ id: 'doc-3', workflowId: 'wf-alive-2' }),
            ],
            total: { value: 3 },
          },
        } as any);
        // Only two of the three parent workflows survive the must_not on
        // `deleted_at`, so `wf-deleted` is omitted from the lookup hits.
        mockAliveWorkflowsLookup(['wf-alive', 'wf-alive-2']);

        const result = await service.listWaitingForInputSteps('default');

        expect(result.results).toHaveLength(2);
        expect(result.results.map((r) => r.id)).toEqual(['doc-1', 'doc-3']);
        expect(result.total).toBe(2);
      });

      it('drops step executions whose parent workflow no longer exists at all', async () => {
        mockEsClient.search.mockResolvedValueOnce({
          hits: {
            hits: [buildHit({ id: 'doc-1', workflowId: 'wf-gone' })],
            total: { value: 1 },
          },
        } as any);
        mockAliveWorkflowsLookup([]);

        const result = await service.listWaitingForInputSteps('default');

        expect(result.results).toEqual([]);
        expect(result.total).toBe(0);
      });

      it('issues the alive-workflow lookup against .workflows-workflows with the right filters', async () => {
        mockEsClient.search.mockResolvedValueOnce({
          hits: {
            hits: [
              buildHit({ workflowId: 'wf-1' }),
              // duplicate workflowId should be deduplicated in the lookup
              buildHit({ id: 'doc-2', workflowId: 'wf-1' }),
              buildHit({ id: 'doc-3', workflowId: 'wf-2' }),
            ],
            total: { value: 3 },
          },
        } as any);
        mockAliveWorkflowsLookup(['wf-1', 'wf-2']);

        await service.listWaitingForInputSteps('default');

        expect(mockEsClient.search).toHaveBeenCalledTimes(2);
        const lookupArgs = mockEsClient.search.mock.calls[1][0] as {
          index: string;
          _source: boolean;
          query: {
            bool: {
              must: Array<Record<string, unknown>>;
              must_not: Array<Record<string, unknown>>;
            };
          };
          size: number;
        };
        expect(lookupArgs.index).toBe(WORKFLOWS_INDEX);
        expect(lookupArgs._source).toBe(false);
        const idsClause = lookupArgs.query.bool.must.find(
          (c): c is { ids: { values: string[] } } => 'ids' in c
        );
        expect(idsClause?.ids.values.sort()).toEqual(['wf-1', 'wf-2']);
        expect(lookupArgs.query.bool.must).toContainEqual({ term: { spaceId: 'default' } });
        expect(lookupArgs.query.bool.must_not).toEqual([{ exists: { field: 'deleted_at' } }]);
      });

      it('skips the parent-workflow lookup when no step executions match', async () => {
        mockEsClient.search.mockResolvedValueOnce({
          hits: { hits: [], total: { value: 0 } },
        } as any);

        const result = await service.listWaitingForInputSteps('default');

        expect(mockEsClient.search).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ results: [], total: 0 });
      });

      it('falls back to unfiltered results and warns when the workflow lookup errors', async () => {
        mockEsClient.search
          .mockResolvedValueOnce({
            hits: { hits: [buildHit()], total: { value: 1 } },
          } as any)
          .mockRejectedValueOnce(new Error('lookup boom'));

        const result = await service.listWaitingForInputSteps('default');

        // Transient lookup failure must not empty the Inbox.
        expect(result.results).toHaveLength(1);
        expect(result.total).toBe(1);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Failed to validate parent workflows for inbox listing')
        );
      });

      it('treats index_not_found on the workflow lookup as "no alive workflows"', async () => {
        mockEsClient.search
          .mockResolvedValueOnce({
            hits: { hits: [buildHit()], total: { value: 1 } },
          } as any)
          .mockRejectedValueOnce(
            new errors.ResponseError({
              statusCode: 404,
              body: { error: { type: 'index_not_found_exception' } },
              headers: {},
              meta: {} as any,
              warnings: [],
            })
          );

        const result = await service.listWaitingForInputSteps('default');

        expect(result.results).toEqual([]);
        expect(result.total).toBe(0);
      });
    });
  });
});
