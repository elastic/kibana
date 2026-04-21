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
import { ExecutionType } from '@kbn/workflows';
import type { IWorkflowEventLoggerService } from '@kbn/workflows-execution-engine/server';

import { WorkflowExecutionQueryService } from './workflow_execution_query_service';

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
});
