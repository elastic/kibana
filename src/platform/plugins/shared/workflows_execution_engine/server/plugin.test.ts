/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { checkAndSkipIfExistingScheduledExecution } from './execution_functions';
import { WorkflowExecutionRepository } from './repositories/workflow_execution_repository';
import { WORKFLOWS_EXECUTIONS_INDEX } from '../common';

describe('checkAndSkipIfExistingScheduledExecution', () => {
  let esClient: jest.Mocked<Client>;
  let workflowExecutionRepository: WorkflowExecutionRepository;
  let logger: Logger;
  let workflow: WorkflowExecutionEngineModel;
  const spaceId = 'default';

  beforeEach(() => {
    esClient =
      elasticsearchServiceMock.createElasticsearchClient() as unknown as jest.Mocked<Client>;
    // Mock index existence check - index doesn't exist initially, then gets created
    if (!esClient.indices) {
      esClient.indices = {} as any;
    }
    esClient.indices.exists = jest.fn().mockResolvedValue(false) as any;
    esClient.indices.create = jest.fn().mockResolvedValue({}) as any;
    workflowExecutionRepository = new WorkflowExecutionRepository(esClient);
    logger = loggingSystemMock.create().get();
    workflow = {
      id: 'test-workflow-id',
      name: 'Test Workflow',
      enabled: true,
      definition: {
        name: 'Test Workflow',
        enabled: false,
        version: '1',
        triggers: [
          {
            type: 'scheduled',
            with: {
              every: '1h',
            },
          },
        ],
        steps: [],
      },
      yaml: 'test yaml',
      isTestRun: false,
    };

    jest.clearAllMocks();
  });

  describe('when no existing non-terminal scheduled execution exists', () => {
    it('should return false and not create a skipped execution', async () => {
      esClient.search.mockResolvedValue({
        hits: {
          hits: [],
          total: { value: 0, relation: 'eq' },
        },
      } as any);

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        logger
      );

      expect(result).toBe(false);
      expect(esClient.search).toHaveBeenCalledWith({
        index: WORKFLOWS_EXECUTIONS_INDEX,
        query: {
          bool: {
            must: [
              { term: { workflowId: workflow.id } },
              { term: { spaceId } },
              { term: { triggeredBy: 'scheduled' } },
            ],
            must_not: [
              {
                terms: {
                  status: [
                    ExecutionStatus.COMPLETED,
                    ExecutionStatus.FAILED,
                    ExecutionStatus.CANCELLED,
                    ExecutionStatus.SKIPPED,
                    ExecutionStatus.TIMED_OUT,
                  ],
                },
              },
            ],
          },
        },
        size: 1,
      });
      expect(esClient.index).not.toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
    });
  });

  describe('when existing non-terminal scheduled execution exists', () => {
    it('should create a SKIPPED execution and return true', async () => {
      const existingExecution = {
        _source: {
          id: 'existing-execution-id',
          workflowId: workflow.id,
          spaceId,
          status: ExecutionStatus.RUNNING,
          triggeredBy: 'scheduled',
        },
      };

      esClient.search.mockResolvedValue({
        hits: {
          hits: [existingExecution],
          total: { value: 1, relation: 'eq' },
        },
      } as any);
      esClient.index.mockResolvedValue({} as any);
      (esClient.indices?.exists as jest.Mock).mockResolvedValue(true);

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        logger
      );

      expect(result).toBe(true);
      expect(esClient.index).toHaveBeenCalledTimes(1);
      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: WORKFLOWS_EXECUTIONS_INDEX,
          refresh: true,
          document: expect.objectContaining({
            spaceId,
            workflowId: workflow.id,
            status: ExecutionStatus.SKIPPED,
            triggeredBy: 'scheduled',
            workflowDefinition: workflow.definition,
            yaml: workflow.yaml,
            isTestRun: workflow.isTestRun,
            cancelRequested: true,
            cancellationReason: 'Skipped due to existing non-terminal scheduled execution',
            cancelledAt: expect.any(String),
            cancelledBy: 'system',
            context: expect.objectContaining({
              spaceId,
              event: {
                type: 'scheduled',
                source: 'task-manager',
                timestamp: expect.any(String),
              },
              triggeredBy: 'scheduled',
            }),
          }),
        })
      );
      expect(logger.info).toHaveBeenCalledWith(
        `Skipping scheduled workflow ${workflow.id} execution - found existing non-terminal scheduled execution`
      );
    });

    it('should handle different non-terminal statuses (PENDING, WAITING, WAITING_FOR_INPUT, RUNNING)', async () => {
      const nonTerminalStatuses = [
        ExecutionStatus.PENDING,
        ExecutionStatus.WAITING,
        ExecutionStatus.WAITING_FOR_INPUT,
        ExecutionStatus.RUNNING,
      ];

      for (const status of nonTerminalStatuses) {
        esClient.search.mockResolvedValue({
          hits: {
            hits: [
              {
                _source: {
                  id: 'existing-execution-id',
                  workflowId: workflow.id,
                  spaceId,
                  status,
                  triggeredBy: 'scheduled',
                },
              },
            ],
            total: { value: 1, relation: 'eq' },
          },
        } as any);
        esClient.index.mockResolvedValue({} as any);
        (esClient.indices?.exists as jest.Mock).mockResolvedValue(true);

        const result = await checkAndSkipIfExistingScheduledExecution(
          workflow,
          spaceId,
          workflowExecutionRepository,
          logger
        );

        expect(result).toBe(true);
        expect(esClient.index).toHaveBeenCalled();
        jest.clearAllMocks();
      }
    });

    it('should not skip when only terminal status executions exist', async () => {
      const terminalStatuses = [
        ExecutionStatus.COMPLETED,
        ExecutionStatus.FAILED,
        ExecutionStatus.CANCELLED,
        ExecutionStatus.SKIPPED,
        ExecutionStatus.TIMED_OUT,
      ];

      for (const _status of terminalStatuses) {
        esClient.search.mockResolvedValue({
          hits: {
            hits: [],
            total: { value: 0, relation: 'eq' },
          },
        } as any);

        const result = await checkAndSkipIfExistingScheduledExecution(
          workflow,
          spaceId,
          workflowExecutionRepository,
          logger
        );

        expect(result).toBe(false);
        expect(esClient.index).not.toHaveBeenCalled();
        jest.clearAllMocks();
      }
    });

    it('should not skip when existing execution is for a different workflow', async () => {
      esClient.search.mockResolvedValue({
        hits: {
          hits: [],
          total: { value: 0, relation: 'eq' },
        },
      } as any);

      const result = await checkAndSkipIfExistingScheduledExecution(
        { ...workflow, id: 'different-workflow-id' },
        spaceId,
        workflowExecutionRepository,
        logger
      );

      expect(result).toBe(false);
      expect(esClient.index).not.toHaveBeenCalled();
    });

    it('should not skip when existing execution is for a different space', async () => {
      esClient.search.mockResolvedValue({
        hits: {
          hits: [],
          total: { value: 0, relation: 'eq' },
        },
      } as any);

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        'different-space',
        workflowExecutionRepository,
        logger
      );

      expect(result).toBe(false);
      expect(esClient.index).not.toHaveBeenCalled();
    });

    it('should not skip when existing execution is not scheduled (triggeredBy !== scheduled)', async () => {
      esClient.search.mockResolvedValue({
        hits: {
          hits: [],
          total: { value: 0, relation: 'eq' },
        },
      } as any);

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        logger
      );

      expect(result).toBe(false);
      expect(esClient.index).not.toHaveBeenCalled();
    });

    it('should create skipped execution with correct context structure', async () => {
      esClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                id: 'existing-execution-id',
                workflowId: workflow.id,
                spaceId,
                status: ExecutionStatus.RUNNING,
                triggeredBy: 'scheduled',
              },
            },
          ],
          total: { value: 1, relation: 'eq' },
        },
      } as any);
      esClient.index.mockResolvedValue({} as any);
      (esClient.indices?.exists as jest.Mock).mockResolvedValue(true);

      await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        logger
      );

      const indexCall = esClient.index.mock.calls[0][0] as any;
      expect(indexCall.document.context).toMatchObject({
        spaceId,
        inputs: {},
        event: {
          type: 'scheduled',
          source: 'task-manager',
          timestamp: expect.any(String),
        },
        triggeredBy: 'scheduled',
      });
      expect(indexCall.document.context.workflowRunId).toMatch(/^scheduled-\d+$/);
    });
  });
});
