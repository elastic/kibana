/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows';
import {
  ExecutionStatus,
  NonTerminalExecutionStatuses,
  TerminalExecutionStatuses,
} from '@kbn/workflows';
import { checkAndSkipIfExistingScheduledExecution } from './execution_functions';
import type { WorkflowExecutionsDataClient } from './repositories/data_access_layer';
import {
  createMockStepDataClient,
  createMockWorkflowDataClient,
} from './repositories/data_access_layer/mocks';
import { StepExecutionRepository } from './repositories/step_execution_repository';
import { WorkflowExecutionRepository } from './repositories/workflow_execution_repository';
import { WORKFLOW_SCHEDULED_TASK_TYPE } from './workflow_task_manager/types';

describe('checkAndSkipIfExistingScheduledExecution', () => {
  let workflowExecutionsDataClient: jest.Mocked<WorkflowExecutionsDataClient>;
  let workflowExecutionRepository: WorkflowExecutionRepository;
  let stepExecutionRepository: StepExecutionRepository;
  let logger: Logger;
  let workflow: WorkflowExecutionEngineModel;
  let currentTaskInstance: ConcreteTaskInstance;
  const spaceId = 'default';
  const baseRunAt = new Date('2024-01-01T10:00:00Z');

  const createMockTaskInstance = (
    overrides?: Partial<ConcreteTaskInstance>
  ): ConcreteTaskInstance => {
    return {
      id: 'task-id',
      taskType: WORKFLOW_SCHEDULED_TASK_TYPE,
      params: { workflowId: workflow.id, spaceId, triggerType: 'scheduled' },
      state: {},
      attempts: 1,
      runAt: baseRunAt,
      scheduledAt: baseRunAt,
      startedAt: baseRunAt,
      retryAt: null,
      status: TaskStatus.Running,
      ownerId: 'kibana-instance-id',
      ...overrides,
    } as ConcreteTaskInstance;
  };

  beforeEach(() => {
    workflowExecutionsDataClient = createMockWorkflowDataClient();
    workflowExecutionRepository = new WorkflowExecutionRepository(workflowExecutionsDataClient);
    stepExecutionRepository = new StepExecutionRepository(createMockStepDataClient());
    jest.spyOn(stepExecutionRepository, 'markNonTerminalStepsFailed').mockResolvedValue(undefined);
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

    currentTaskInstance = createMockTaskInstance();
    jest.clearAllMocks();
  });

  describe('when no existing non-terminal scheduled execution exists', () => {
    it('should return false and not create a skipped execution', async () => {
      workflowExecutionsDataClient.search.mockResolvedValue({
        hits: {
          hits: [],
          total: { value: 0, relation: 'eq' },
        },
      } as any);

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        stepExecutionRepository,
        currentTaskInstance,
        logger
      );

      expect(result.skipped).toBe(false);
      expect(workflowExecutionsDataClient.search).toHaveBeenCalledWith({
        query: {
          bool: {
            filter: [
              { term: { workflowId: workflow.id } },
              { term: { spaceId } },
              {
                terms: {
                  status: NonTerminalExecutionStatuses,
                },
              },
              { term: { triggeredBy: 'scheduled' } },
            ],
          },
        },
        size: 1,
        terminate_after: 1,
      });
      expect(workflowExecutionsDataClient.bulk).not.toHaveBeenCalled();
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

      workflowExecutionsDataClient.search.mockResolvedValue({
        hits: {
          hits: [existingExecution],
          total: { value: 1, relation: 'eq' },
        },
      } as any);
      workflowExecutionsDataClient.bulk.mockResolvedValue({} as any);

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        stepExecutionRepository,
        currentTaskInstance,
        logger
      );

      expect(result.skipped).toBe(true);
      expect(result.workflowExecutionId).toEqual(expect.any(String));
      expect(workflowExecutionsDataClient.bulk).toHaveBeenCalledTimes(1);
      expect(workflowExecutionsDataClient.bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          refresh: false,
          items: [
            {
              operation: 'create',
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
            },
          ],
        })
      );
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining(
          `Skipping scheduled workflow ${workflow.id} execution - found existing non-terminal scheduled execution`
        )
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
        workflowExecutionsDataClient.search.mockResolvedValue({
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
        workflowExecutionsDataClient.bulk.mockResolvedValue({} as any);

        const result = await checkAndSkipIfExistingScheduledExecution(
          workflow,
          spaceId,
          workflowExecutionRepository,
          stepExecutionRepository,
          currentTaskInstance,
          logger
        );

        expect(result.skipped).toBe(true);
        expect(workflowExecutionsDataClient.bulk).toHaveBeenCalled();
        jest.clearAllMocks();
      }
    });

    it('should not skip when only terminal status executions exist', async () => {
      for (const _status of TerminalExecutionStatuses) {
        workflowExecutionsDataClient.search.mockResolvedValue({
          hits: {
            hits: [],
            total: { value: 0, relation: 'eq' },
          },
        } as any);

        const result = await checkAndSkipIfExistingScheduledExecution(
          workflow,
          spaceId,
          workflowExecutionRepository,
          stepExecutionRepository,
          currentTaskInstance,
          logger
        );

        expect(result.skipped).toBe(false);
        expect(workflowExecutionsDataClient.bulk).not.toHaveBeenCalled();
        jest.clearAllMocks();
      }
    });

    it('should not skip when existing execution is for a different workflow', async () => {
      workflowExecutionsDataClient.search.mockResolvedValue({
        hits: {
          hits: [],
          total: { value: 0, relation: 'eq' },
        },
      } as any);

      const result = await checkAndSkipIfExistingScheduledExecution(
        { ...workflow, id: 'different-workflow-id' },
        spaceId,
        workflowExecutionRepository,
        stepExecutionRepository,
        currentTaskInstance,
        logger
      );

      expect(result.skipped).toBe(false);
      expect(workflowExecutionsDataClient.bulk).not.toHaveBeenCalled();
    });

    it('should not skip when existing execution is for a different space', async () => {
      workflowExecutionsDataClient.search.mockResolvedValue({
        hits: {
          hits: [],
          total: { value: 0, relation: 'eq' },
        },
      } as any);

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        'different-space',
        workflowExecutionRepository,
        stepExecutionRepository,
        currentTaskInstance,
        logger
      );

      expect(result.skipped).toBe(false);
      expect(workflowExecutionsDataClient.bulk).not.toHaveBeenCalled();
    });

    it('should not skip when existing execution is not scheduled (triggeredBy !== scheduled)', async () => {
      workflowExecutionsDataClient.search.mockResolvedValue({
        hits: {
          hits: [],
          total: { value: 0, relation: 'eq' },
        },
      } as any);

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        stepExecutionRepository,
        currentTaskInstance,
        logger
      );

      expect(result.skipped).toBe(false);
      expect(workflowExecutionsDataClient.bulk).not.toHaveBeenCalled();
    });

    it('should create skipped execution with correct context structure', async () => {
      workflowExecutionsDataClient.search.mockResolvedValue({
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
      workflowExecutionsDataClient.bulk.mockResolvedValue({} as any);

      await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        stepExecutionRepository,
        currentTaskInstance,
        logger
      );

      const bulkCall = workflowExecutionsDataClient.bulk.mock.calls[0]![0] as {
        items: Array<{ document: { context: Record<string, unknown> } }>;
      };
      expect(bulkCall.items[0]!.document.context).toMatchObject({
        spaceId,
        inputs: {},
        event: {
          type: 'scheduled',
          source: 'task-manager',
          timestamp: expect.any(String),
        },
        triggeredBy: 'scheduled',
      });
      expect(bulkCall.items[0]!.document.context.workflowRunId).toMatch(/^scheduled-\d+$/);
    });
  });

  describe('taskRunAt comparison logic', () => {
    it('should mark execution as FAILED and proceed when taskRunAt matches AND attempts > 1 (stale execution from task recovery)', async () => {
      const matchingRunAt = baseRunAt.toISOString();
      const existingExecution = {
        _source: {
          id: 'existing-execution-id',
          workflowId: workflow.id,
          spaceId,
          status: ExecutionStatus.PENDING,
          triggeredBy: 'scheduled',
          taskRunAt: matchingRunAt,
        },
      };

      workflowExecutionsDataClient.search.mockResolvedValue({
        hits: {
          hits: [existingExecution],
          total: { value: 1, relation: 'eq' },
        },
      } as any);
      workflowExecutionsDataClient.bulk.mockResolvedValue({} as any);

      // Use attempts > 1 to indicate this is a retry/recovery
      const retryTaskInstance = createMockTaskInstance({ attempts: 2 });

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        stepExecutionRepository,
        retryTaskInstance,
        logger
      );

      expect(result.skipped).toBe(false); // Proceed with new execution
      expect(workflowExecutionsDataClient.bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              operation: 'update',
              document: expect.objectContaining({
                id: 'existing-execution-id',
                status: ExecutionStatus.FAILED,
                error: {
                  type: 'TaskRecoveryError',
                  message: expect.stringContaining('Execution abandoned'),
                },
              }),
            }),
          ],
        })
      );
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Found stale execution'));
      expect(workflowExecutionsDataClient.bulk).toHaveBeenCalledTimes(1);
    });

    it('should skip without failing when stale execution is waiting_for_input', async () => {
      const matchingRunAt = baseRunAt.toISOString();
      const existingExecution = {
        _source: {
          id: 'existing-execution-id',
          workflowId: workflow.id,
          spaceId,
          status: ExecutionStatus.WAITING_FOR_INPUT,
          triggeredBy: 'scheduled',
          taskRunAt: matchingRunAt,
        },
      };

      workflowExecutionsDataClient.search.mockResolvedValue({
        hits: {
          hits: [existingExecution],
          total: { value: 1, relation: 'eq' },
        },
      } as any);

      const retryTaskInstance = createMockTaskInstance({ attempts: 2 });

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        stepExecutionRepository,
        retryTaskInstance,
        logger
      );

      expect(result.skipped).toBe(true);
      expect(result.workflowExecutionId).toBe('existing-execution-id');
      expect(workflowExecutionsDataClient.bulk).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('waiting_for_input'));
    });

    it('should skip (not mark as failed) when taskRunAt matches BUT attempts = 1 (first attempt, execution from this run)', async () => {
      const matchingRunAt = baseRunAt.toISOString();
      const existingExecution = {
        _source: {
          id: 'existing-execution-id',
          workflowId: workflow.id,
          spaceId,
          status: ExecutionStatus.PENDING,
          triggeredBy: 'scheduled',
          taskRunAt: matchingRunAt,
        },
      };

      workflowExecutionsDataClient.search.mockResolvedValue({
        hits: {
          hits: [existingExecution],
          total: { value: 1, relation: 'eq' },
        },
      } as any);
      workflowExecutionsDataClient.bulk.mockResolvedValue({} as any);

      // Use attempts = 1 (first attempt)
      const firstAttemptTaskInstance = createMockTaskInstance({ attempts: 1 });

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        stepExecutionRepository,
        firstAttemptTaskInstance,
        logger
      );

      expect(result.skipped).toBe(true); // Skip (don't mark as failed - execution is from this attempt)
      expect(workflowExecutionsDataClient.bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              operation: 'create',
              document: expect.objectContaining({
                status: ExecutionStatus.SKIPPED,
              }),
            }),
          ],
        })
      );
    });

    it('should skip when taskRunAt differs (legitimate concurrent execution from different scheduled run)', async () => {
      const differentRunAt = new Date('2024-01-01T09:00:00Z').toISOString(); // Different scheduled run
      const existingExecution = {
        _source: {
          id: 'existing-execution-id',
          workflowId: workflow.id,
          spaceId,
          status: ExecutionStatus.RUNNING,
          triggeredBy: 'scheduled',
          taskRunAt: differentRunAt,
        },
      };

      workflowExecutionsDataClient.search.mockResolvedValue({
        hits: {
          hits: [existingExecution],
          total: { value: 1, relation: 'eq' },
        },
      } as any);
      workflowExecutionsDataClient.bulk.mockResolvedValue({} as any);

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        stepExecutionRepository,
        currentTaskInstance,
        logger
      );

      expect(result.skipped).toBe(true); // Skip current run
      expect(workflowExecutionsDataClient.bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              operation: 'create',
              document: expect.objectContaining({
                status: ExecutionStatus.SKIPPED,
              }),
            }),
          ],
        })
      );
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Skipping scheduled workflow')
      );
    });

    it('should skip when execution has no taskRunAt (legacy execution)', async () => {
      const existingExecution = {
        _source: {
          id: 'existing-execution-id',
          workflowId: workflow.id,
          spaceId,
          status: ExecutionStatus.RUNNING,
          triggeredBy: 'scheduled',
          // No taskRunAt field (legacy execution)
        },
      };

      workflowExecutionsDataClient.search.mockResolvedValue({
        hits: {
          hits: [existingExecution],
          total: { value: 1, relation: 'eq' },
        },
      } as any);
      workflowExecutionsDataClient.bulk.mockResolvedValue({} as any);

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        stepExecutionRepository,
        currentTaskInstance,
        logger
      );

      expect(result.skipped).toBe(true); // Skip to be safe
      expect(workflowExecutionsDataClient.bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              operation: 'create',
              document: expect.objectContaining({
                status: ExecutionStatus.SKIPPED,
              }),
            }),
          ],
        })
      );
    });

    it('should skip when current task has no runAt', async () => {
      const existingExecution = {
        _source: {
          id: 'existing-execution-id',
          workflowId: workflow.id,
          spaceId,
          status: ExecutionStatus.RUNNING,
          triggeredBy: 'scheduled',
          taskRunAt: baseRunAt.toISOString(),
        },
      };

      workflowExecutionsDataClient.search.mockResolvedValue({
        hits: {
          hits: [existingExecution],
          total: { value: 1, relation: 'eq' },
        },
      } as any);
      workflowExecutionsDataClient.bulk.mockResolvedValue({} as any);

      const taskInstanceWithoutRunAt = createMockTaskInstance({ runAt: undefined as any });

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        stepExecutionRepository,
        taskInstanceWithoutRunAt,
        logger
      );

      expect(result.skipped).toBe(true); // Skip when we can't compare
      expect(workflowExecutionsDataClient.bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              operation: 'create',
              document: expect.objectContaining({
                status: ExecutionStatus.SKIPPED,
              }),
            }),
          ],
        })
      );
    });

    it('should handle RUNNING status execution with matching taskRunAt AND attempts > 1 (stale)', async () => {
      const matchingRunAt = baseRunAt.toISOString();
      const existingExecution = {
        _source: {
          id: 'existing-execution-id',
          workflowId: workflow.id,
          spaceId,
          status: ExecutionStatus.RUNNING,
          triggeredBy: 'scheduled',
          taskRunAt: matchingRunAt,
        },
      };

      workflowExecutionsDataClient.search.mockResolvedValue({
        hits: {
          hits: [existingExecution],
          total: { value: 1, relation: 'eq' },
        },
      } as any);
      workflowExecutionsDataClient.bulk.mockResolvedValue({} as any);

      // Use attempts > 1 to indicate this is a retry/recovery
      const retryTaskInstance = createMockTaskInstance({ attempts: 2 });

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        stepExecutionRepository,
        retryTaskInstance,
        logger
      );

      expect(result.skipped).toBe(false); // Proceed - mark stale as failed
      expect(workflowExecutionsDataClient.bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              operation: 'update',
              document: expect.objectContaining({
                id: 'existing-execution-id',
                status: ExecutionStatus.FAILED,
              }),
            }),
          ],
        })
      );
    });

    it('fails abandoned pending from a prior taskRunAt and proceeds (schedule moved on)', async () => {
      const priorRunAt = new Date('2024-01-01T09:00:00Z').toISOString();
      workflowExecutionsDataClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                id: 'abandoned-pending-id',
                workflowId: workflow.id,
                spaceId,
                status: ExecutionStatus.PENDING,
                triggeredBy: 'scheduled',
                taskRunAt: priorRunAt,
              },
            },
          ],
          total: { value: 1, relation: 'eq' },
        },
      } as any);
      workflowExecutionsDataClient.bulk.mockResolvedValue({} as any);

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        stepExecutionRepository,
        currentTaskInstance,
        logger
      );

      expect(result.skipped).toBe(false);
      expect(workflowExecutionsDataClient.bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              operation: 'update',
              document: expect.objectContaining({
                id: 'abandoned-pending-id',
                status: ExecutionStatus.FAILED,
                error: expect.objectContaining({
                  message: expect.stringContaining('later schedule tick superseded'),
                }),
              }),
            }),
          ],
          refresh: 'wait_for',
        })
      );
      expect(workflowExecutionsDataClient.bulk).not.toHaveBeenCalledWith(
        expect.objectContaining({ items: [expect.objectContaining({ operation: 'create' })] })
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('abandoned pending execution')
      );
    });

    it('does not treat RUNNING from a prior taskRunAt as abandoned pending', async () => {
      const priorRunAt = new Date('2024-01-01T09:00:00Z').toISOString();
      workflowExecutionsDataClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                id: 'still-running-id',
                workflowId: workflow.id,
                spaceId,
                status: ExecutionStatus.RUNNING,
                triggeredBy: 'scheduled',
                taskRunAt: priorRunAt,
              },
            },
          ],
          total: { value: 1, relation: 'eq' },
        },
      } as any);
      workflowExecutionsDataClient.bulk.mockResolvedValue({} as any);

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        stepExecutionRepository,
        currentTaskInstance,
        logger
      );

      expect(result.skipped).toBe(true);
      expect(workflowExecutionsDataClient.bulk).not.toHaveBeenCalledWith(
        expect.objectContaining({ items: [expect.objectContaining({ operation: 'update' })] })
      );
      expect(workflowExecutionsDataClient.bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              operation: 'create',
              document: expect.objectContaining({
                status: ExecutionStatus.SKIPPED,
              }),
            }),
          ],
        })
      );
    });

    it('does not reap prior-taskRunAt PENDING when TM still has active work (promoted backlog)', async () => {
      // Queue drain promotes QUEUED→PENDING while keeping the backlog item's older taskRunAt
      // and starts it via workflow:run; that PENDING must not be treated as an orphan.
      const priorRunAt = new Date('2024-01-01T09:00:00Z').toISOString();
      const hasActiveTaskForExecution = jest.fn().mockResolvedValue(true);
      workflowExecutionsDataClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                id: 'promoted-queued-id',
                workflowId: workflow.id,
                spaceId,
                status: ExecutionStatus.PENDING,
                triggeredBy: 'scheduled',
                taskRunAt: priorRunAt,
              },
            },
          ],
          total: { value: 1, relation: 'eq' },
        },
      } as any);

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        stepExecutionRepository,
        currentTaskInstance,
        logger,
        { createSkippedForInFlightDuplicates: false, hasActiveTaskForExecution }
      );

      expect(result.skipped).toBe(false);
      expect(hasActiveTaskForExecution).toHaveBeenCalledWith('promoted-queued-id');
      expect(workflowExecutionsDataClient.bulk).not.toHaveBeenCalledWith(
        expect.objectContaining({ items: [expect.objectContaining({ operation: 'update' })] })
      );
      expect(workflowExecutionsDataClient.bulk).not.toHaveBeenCalledWith(
        expect.objectContaining({ items: [expect.objectContaining({ operation: 'create' })] })
      );
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('still has active Task Manager work')
      );
    });

    it('still reaps prior-taskRunAt PENDING when TM has no active work for the execution', async () => {
      const priorRunAt = new Date('2024-01-01T09:00:00Z').toISOString();
      const hasActiveTaskForExecution = jest.fn().mockResolvedValue(false);
      workflowExecutionsDataClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                id: 'orphan-pending-id',
                workflowId: workflow.id,
                spaceId,
                status: ExecutionStatus.PENDING,
                triggeredBy: 'scheduled',
                taskRunAt: priorRunAt,
              },
            },
          ],
          total: { value: 1, relation: 'eq' },
        },
      } as any);
      workflowExecutionsDataClient.bulk.mockResolvedValue({} as any);

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        stepExecutionRepository,
        currentTaskInstance,
        logger,
        { createSkippedForInFlightDuplicates: false, hasActiveTaskForExecution }
      );

      expect(result.skipped).toBe(false);
      expect(hasActiveTaskForExecution).toHaveBeenCalledWith('orphan-pending-id');
      expect(workflowExecutionsDataClient.bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              operation: 'update',
              document: expect.objectContaining({
                id: 'orphan-pending-id',
                status: ExecutionStatus.FAILED,
              }),
            }),
          ],
          refresh: 'wait_for',
        })
      );
    });
  });

  describe('createSkippedForInFlightDuplicates: false (concurrency workflows)', () => {
    it('still fails stale same-taskRunAt pending on retry so the concurrency slot can free', async () => {
      const matchingRunAt = baseRunAt.toISOString();
      workflowExecutionsDataClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                id: 'orphaned-pending-id',
                workflowId: workflow.id,
                spaceId,
                status: ExecutionStatus.PENDING,
                triggeredBy: 'scheduled',
                taskRunAt: matchingRunAt,
              },
            },
          ],
          total: { value: 1, relation: 'eq' },
        },
      } as any);
      workflowExecutionsDataClient.bulk.mockResolvedValue({} as any);

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        stepExecutionRepository,
        createMockTaskInstance({ attempts: 2 }),
        logger,
        { createSkippedForInFlightDuplicates: false }
      );

      expect(result.skipped).toBe(false);
      expect(workflowExecutionsDataClient.bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              operation: 'update',
              document: expect.objectContaining({
                id: 'orphaned-pending-id',
                status: ExecutionStatus.FAILED,
              }),
            }),
          ],
        })
      );
      expect(workflowExecutionsDataClient.bulk).not.toHaveBeenCalledWith(
        expect.objectContaining({ items: [expect.objectContaining({ operation: 'create' })] })
      );
    });

    it('does not create SKIPPED for a different in-flight taskRunAt (defers to concurrency)', async () => {
      const differentRunAt = new Date('2024-01-01T09:00:00Z').toISOString();
      workflowExecutionsDataClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                id: 'existing-execution-id',
                workflowId: workflow.id,
                spaceId,
                status: ExecutionStatus.RUNNING,
                triggeredBy: 'scheduled',
                taskRunAt: differentRunAt,
              },
            },
          ],
          total: { value: 1, relation: 'eq' },
        },
      } as any);

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        stepExecutionRepository,
        currentTaskInstance,
        logger,
        { createSkippedForInFlightDuplicates: false }
      );

      expect(result.skipped).toBe(false);
      expect(workflowExecutionsDataClient.bulk).not.toHaveBeenCalledWith(
        expect.objectContaining({ items: [expect.objectContaining({ operation: 'update' })] })
      );
      expect(workflowExecutionsDataClient.bulk).not.toHaveBeenCalledWith(
        expect.objectContaining({ items: [expect.objectContaining({ operation: 'create' })] })
      );
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Deferring in-flight scheduled overlap')
      );
    });

    it('does not create SKIPPED for same taskRunAt on first attempt (defers to concurrency)', async () => {
      workflowExecutionsDataClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                id: 'existing-execution-id',
                workflowId: workflow.id,
                spaceId,
                status: ExecutionStatus.PENDING,
                triggeredBy: 'scheduled',
                taskRunAt: baseRunAt.toISOString(),
              },
            },
          ],
          total: { value: 1, relation: 'eq' },
        },
      } as any);

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        workflowExecutionRepository,
        stepExecutionRepository,
        createMockTaskInstance({ attempts: 1 }),
        logger,
        { createSkippedForInFlightDuplicates: false }
      );

      expect(result.skipped).toBe(false);
      expect(workflowExecutionsDataClient.bulk).not.toHaveBeenCalledWith(
        expect.objectContaining({ items: [expect.objectContaining({ operation: 'update' })] })
      );
      expect(workflowExecutionsDataClient.bulk).not.toHaveBeenCalledWith(
        expect.objectContaining({ items: [expect.objectContaining({ operation: 'create' })] })
      );
    });
  });
});

describe('elastic-apm-node dynamic import pattern', () => {
  const mockStartSpan = jest.fn().mockReturnValue({ end: jest.fn() });
  const mockSetLabel = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    jest.mock('elastic-apm-node', () => ({
      __esModule: true,
      default: {
        startSpan: mockStartSpan,
        currentTransaction: { setLabel: mockSetLabel },
      },
    }));
    mockStartSpan.mockClear();
    mockSetLabel.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should access startSpan on the default export when using destructured import', async () => {
    // This is the correct pattern used in plugin.ts:
    //   const { default: apm } = await import('elastic-apm-node');
    //   apm.startSpan(...)
    const { default: apm } = await import('elastic-apm-node');

    expect(typeof apm.startSpan).toBe('function');

    const span = apm.startSpan('test span', 'workflow', 'execution');
    expect(span).toBeDefined();
    expect(mockStartSpan).toHaveBeenCalledWith('test span', 'workflow', 'execution');
    span?.end();
  });

  it('should access currentTransaction on the default export when using destructured import', async () => {
    const { default: apm } = await import('elastic-apm-node');

    expect(apm.currentTransaction).toBeDefined();
    apm.currentTransaction?.setLabel('test_key', 'test_value');
    expect(mockSetLabel).toHaveBeenCalledWith('test_key', 'test_value');
  });

  it('should NOT have startSpan on module namespace (regression: non-destructured import)', async () => {
    // This was the bug: using `const apm = await import('elastic-apm-node')`
    // without destructuring puts the module namespace in `apm`, where
    // startSpan lives at apm.default.startSpan, not apm.startSpan
    const moduleNamespace = await import('elastic-apm-node');

    // startSpan should NOT exist on the module namespace directly
    expect((moduleNamespace as Record<string, unknown>).startSpan).toBeUndefined();

    // It must live on the default export
    expect(typeof moduleNamespace.default.startSpan).toBe('function');
  });
});
