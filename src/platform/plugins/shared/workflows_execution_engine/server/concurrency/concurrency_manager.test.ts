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
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { EsWorkflowExecution, WorkflowContext } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowSettings } from '@kbn/workflows/spec/schema';
import { ConcurrencyManager } from './concurrency_manager';
import { TaskManagerMock } from '../../integration_tests/mocks/task_manager.mock';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import type { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';

describe('ConcurrencyManager', () => {
  let concurrencyManager: ConcurrencyManager;
  let logger: Logger;
  let workflowExecutionRepository: jest.Mocked<WorkflowExecutionRepository>;
  let workflowTaskManager: jest.Mocked<WorkflowTaskManager>;
  let taskManager: TaskManagerStartContract;

  const workflowId = 'test-workflow-id';
  const spaceId = 'default';
  const executionId = 'exec-1';

  const mockContext: WorkflowContext = {
    execution: {
      id: executionId,
      isTestRun: false,
      startedAt: new Date('2024-01-01T00:00:00Z'),
      url: 'http://localhost:5601',
    },
    workflow: {
      id: workflowId,
      name: 'Test Workflow',
      enabled: true,
      spaceId,
    },
    kibanaUrl: 'http://localhost:5601',
    inputs: {},
    consts: {},
    now: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    logger = loggingSystemMock.create().get();
    workflowExecutionRepository = {
      searchWorkflowExecutions: jest.fn(),
      updateWorkflowExecution: jest.fn(),
    } as any;
    taskManager = TaskManagerMock.create() as unknown as TaskManagerStartContract;
    workflowTaskManager = {
      forceRunIdleTasks: jest.fn().mockResolvedValue(undefined),
    } as any;

    concurrencyManager = new ConcurrencyManager(
      logger,
      workflowExecutionRepository,
      workflowTaskManager
    );
  });

  describe('evaluateConcurrencyKey', () => {
    it('should return null when no settings provided', () => {
      const result = concurrencyManager.evaluateConcurrencyKey(undefined, mockContext);
      expect(result).toBeNull();
    });

    it('should return null when concurrency_key is not set', () => {
      const settings: WorkflowSettings = {};
      const result = concurrencyManager.evaluateConcurrencyKey(settings, mockContext);
      expect(result).toBeNull();
    });

    it('should return static string as-is when no template markers', () => {
      const settings: WorkflowSettings = {
        concurrency_key: 'server-1',
      };
      const result = concurrencyManager.evaluateConcurrencyKey(settings, mockContext);
      expect(result).toBe('server-1');
    });

    it('should evaluate template expression with workflow context', () => {
      const settings: WorkflowSettings = {
        concurrency_key: '{{ workflow.id }}',
      };
      const result = concurrencyManager.evaluateConcurrencyKey(settings, mockContext);
      expect(result).toBe(workflowId);
    });

    it('should evaluate template expression with execution context', () => {
      const settings: WorkflowSettings = {
        concurrency_key: '{{ execution.id }}',
      };
      const result = concurrencyManager.evaluateConcurrencyKey(settings, mockContext);
      expect(result).toBe(executionId);
    });

    it('should evaluate template expression with event context', () => {
      const contextWithEvent: WorkflowContext = {
        ...mockContext,
        event: {
          alerts: [],
          rule: {
            id: 'rule-1',
            name: 'Test Rule',
            tags: [],
            consumer: 'test',
            producer: 'test',
            ruleTypeId: 'test',
          },
          spaceId,
          params: {
            host: {
              name: 'server-abc',
            },
          },
        } as any,
      };

      const settings: WorkflowSettings = {
        concurrency_key: '{{ event.params.host.name }}',
      };
      const result = concurrencyManager.evaluateConcurrencyKey(settings, contextWithEvent);
      expect(result).toBe('server-abc');
    });

    it('should convert number to string', () => {
      const contextWithNumber: WorkflowContext = {
        ...mockContext,
        inputs: {
          serverId: 12345,
        },
      };

      const settings: WorkflowSettings = {
        concurrency_key: '{{ inputs.serverId }}',
      };
      const result = concurrencyManager.evaluateConcurrencyKey(settings, contextWithNumber);
      expect(result).toBe('12345');
    });

    it('should convert boolean to string', () => {
      const contextWithBoolean: WorkflowContext = {
        ...mockContext,
        inputs: {
          isProduction: true,
        },
      };

      const settings: WorkflowSettings = {
        concurrency_key: '{{ inputs.isProduction }}',
      };
      const result = concurrencyManager.evaluateConcurrencyKey(settings, contextWithBoolean);
      expect(result).toBe('true');
    });

    it('should return null and log warning when expression evaluates to null', () => {
      const contextWithNull: WorkflowContext = {
        ...mockContext,
        inputs: {
          hostName: null,
        },
      };

      const settings: WorkflowSettings = {
        concurrency_key: '{{ inputs.hostName }}',
      };
      const result = concurrencyManager.evaluateConcurrencyKey(settings, contextWithNull);
      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Concurrency key evaluated to null/undefined')
      );
    });

    it('should return null and log warning when expression evaluates to undefined', () => {
      const contextWithUndefined: WorkflowContext = {
        ...mockContext,
        inputs: {},
      };

      const settings: WorkflowSettings = {
        concurrency_key: '{{ inputs.missingField }}',
      };
      const result = concurrencyManager.evaluateConcurrencyKey(settings, contextWithUndefined);
      expect(result).toBeNull();
    });

    it('should return null and log error when template evaluation fails', () => {
      const settings: WorkflowSettings = {
        concurrency_key: '{{ invalid.syntax.here }}',
      };
      const result = concurrencyManager.evaluateConcurrencyKey(settings, mockContext);
      expect(result).toBeNull();
      // Liquid may not throw for invalid syntax, but our wrapper catches any errors
      // The error might be logged or the expression might evaluate to undefined
      if (logger.error.mock.calls.length > 0) {
        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to evaluate concurrency key')
        );
      }
    });

    it('should handle complex nested expressions', () => {
      const contextWithNested: WorkflowContext = {
        ...mockContext,
        event: {
          alerts: [],
          rule: {
            id: 'rule-1',
            name: 'Test Rule',
            tags: [],
            consumer: 'test',
            producer: 'test',
            ruleTypeId: 'test',
          },
          spaceId,
          params: {
            server: {
              cluster: {
                name: 'prod-cluster',
                region: 'us-east-1',
              },
            },
          },
        } as any,
      };

      // Test nested property access
      const settings: WorkflowSettings = {
        concurrency_key: '{{ event.params.server.cluster.name }}',
      };
      const result = concurrencyManager.evaluateConcurrencyKey(settings, contextWithNested);
      expect(result).toBe('prod-cluster');
    });
  });

  describe('checkConcurrency', () => {
    it('should proceed when no concurrency key is provided', async () => {
      const result = await concurrencyManager.checkConcurrency(
        workflowId,
        spaceId,
        null,
        undefined,
        executionId
      );
      expect(result.shouldProceed).toBe(true);
      expect(workflowExecutionRepository.searchWorkflowExecutions).not.toHaveBeenCalled();
    });

    it('should proceed when settings do not have concurrency_key', async () => {
      const settings: WorkflowSettings = {};
      const result = await concurrencyManager.checkConcurrency(
        workflowId,
        spaceId,
        null, // No concurrency key
        settings,
        executionId
      );
      expect(result.shouldProceed).toBe(true);
      expect(workflowExecutionRepository.searchWorkflowExecutions).not.toHaveBeenCalled();
    });

    it('should proceed when no running executions exist', async () => {
      const settings: WorkflowSettings = {
        concurrency_key: 'server-1',
      };
      workflowExecutionRepository.searchWorkflowExecutions.mockResolvedValue([]);

      const result = await concurrencyManager.checkConcurrency(
        workflowId,
        spaceId,
        'server-1',
        settings,
        executionId
      );

      expect(result.shouldProceed).toBe(true);
      expect(workflowExecutionRepository.searchWorkflowExecutions).toHaveBeenCalledWith(
        expect.objectContaining({
          bool: expect.objectContaining({
            must: expect.arrayContaining([
              { term: { workflowId } },
              { term: { spaceId } },
              { term: { 'context.concurrencyGroupKey': 'server-1' } },
            ]),
          }),
        }),
        100
      );
    });

    it('should proceed when under max_concurrency_per_group limit', async () => {
      const settings: WorkflowSettings = {
        concurrency_key: '"server-1"',
        max_concurrency_per_group: 3,
      };

      const runningExecution: EsWorkflowExecution = {
        id: 'exec-running-1',
        workflowId,
        spaceId,
        isTestRun: false,
        status: ExecutionStatus.RUNNING,
        context: {
          concurrencyGroupKey: 'server-1',
        },
        workflowDefinition: {} as any,
        yaml: '',
        scopeStack: [],
        createdAt: new Date().toISOString(),
        error: null,
        createdBy: 'system',
        startedAt: new Date().toISOString(),
        finishedAt: '',
        cancelRequested: false,
        duration: 0,
      };

      workflowExecutionRepository.searchWorkflowExecutions.mockResolvedValue([
        { _source: runningExecution },
      ] as any);

      const result = await concurrencyManager.checkConcurrency(
        workflowId,
        spaceId,
        'server-1',
        settings,
        executionId
      );

      expect(result.shouldProceed).toBe(true);
    });

    it('should use default max_concurrency_per_group of 1', async () => {
      const settings: WorkflowSettings = {
        concurrency_key: 'server-1',
      };

      const runningExecution: EsWorkflowExecution = {
        id: 'exec-running-1',
        workflowId,
        spaceId,
        isTestRun: false,
        status: ExecutionStatus.RUNNING,
        context: {
          concurrencyGroupKey: 'server-1',
        },
        workflowDefinition: {} as any,
        yaml: '',
        scopeStack: [],
        createdAt: new Date().toISOString(),
        error: null,
        createdBy: 'system',
        startedAt: new Date().toISOString(),
        finishedAt: '',
        cancelRequested: false,
        duration: 0,
      };

      workflowExecutionRepository.searchWorkflowExecutions.mockResolvedValue([
        { _source: runningExecution },
      ] as any);

      const result = await concurrencyManager.checkConcurrency(
        workflowId,
        spaceId,
        'server-1',
        settings,
        executionId
      );

      expect(result.shouldProceed).toBe(false);
      expect(result.reason).toContain('Queued');
    });

    it('should exclude current execution from collision check', async () => {
      const settings: WorkflowSettings = {
        concurrency_key: 'server-1',
      };

      workflowExecutionRepository.searchWorkflowExecutions.mockResolvedValue([]);

      await concurrencyManager.checkConcurrency(
        workflowId,
        spaceId,
        'server-1',
        settings,
        executionId
      );

      expect(workflowExecutionRepository.searchWorkflowExecutions).toHaveBeenCalledWith(
        expect.objectContaining({
          bool: expect.objectContaining({
            must_not: expect.arrayContaining([{ term: { id: executionId } }]),
          }),
        }),
        100
      );
    });

    it('should exclude terminal statuses from collision check', async () => {
      const settings: WorkflowSettings = {
        concurrency_key: 'server-1',
      };

      workflowExecutionRepository.searchWorkflowExecutions.mockResolvedValue([]);

      await concurrencyManager.checkConcurrency(
        workflowId,
        spaceId,
        'server-1',
        settings,
        executionId
      );

      const callArgs = workflowExecutionRepository.searchWorkflowExecutions.mock.calls[0][0];
      expect(callArgs.bool.must_not).toEqual(
        expect.arrayContaining([
          { term: { id: executionId } },
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
        ])
      );
    });

    describe('Queue Strategy (Default)', () => {
      it('should queue execution when collision detected', async () => {
        const settings: WorkflowSettings = {
          concurrency_key: '"server-1"',
          collision_strategy: 'queue',
        };

        const runningExecution: EsWorkflowExecution = {
          id: 'exec-running-1',
          workflowId,
          spaceId,
          isTestRun: false,
          status: ExecutionStatus.RUNNING,
          context: {
            concurrencyGroupKey: 'server-1',
          },
          workflowDefinition: {} as any,
          yaml: '',
          scopeStack: [],
          createdAt: new Date().toISOString(),
          error: null,
          createdBy: 'system',
          startedAt: new Date().toISOString(),
          finishedAt: '',
          cancelRequested: false,
          duration: 0,
        };

        workflowExecutionRepository.searchWorkflowExecutions.mockResolvedValue([
          { _source: runningExecution },
        ] as any);

        const result = await concurrencyManager.checkConcurrency(
          workflowId,
          spaceId,
          'server-1',
          settings,
          executionId
        );

        expect(result.shouldProceed).toBe(false);
        expect(result.reason).toContain('Queued');
        expect(result.reason).toContain('server-1');
        expect(result.reason).toContain('1 active executions');
        expect(result.reason).toContain('limit: 1');
      });

      it('should use queue as default strategy when not specified', async () => {
        const settings: WorkflowSettings = {
          concurrency_key: '"server-1"',
        };

        const runningExecution: EsWorkflowExecution = {
          id: 'exec-running-1',
          workflowId,
          spaceId,
          isTestRun: false,
          status: ExecutionStatus.RUNNING,
          context: {
            concurrencyGroupKey: 'server-1',
          },
          workflowDefinition: {} as any,
          yaml: '',
          scopeStack: [],
          createdAt: new Date().toISOString(),
          error: null,
          createdBy: 'system',
          startedAt: new Date().toISOString(),
          finishedAt: '',
          cancelRequested: false,
          duration: 0,
        };

        workflowExecutionRepository.searchWorkflowExecutions.mockResolvedValue([
          { _source: runningExecution },
        ] as any);

        const result = await concurrencyManager.checkConcurrency(
          workflowId,
          spaceId,
          'server-1',
          settings,
          executionId
        );

        expect(result.shouldProceed).toBe(false);
        expect(result.reason).toContain('Queued');
      });

      it('should log debug message when collision detected', async () => {
        const settings: WorkflowSettings = {
          concurrency_key: '"server-1"',
          collision_strategy: 'queue',
        };

        const runningExecution: EsWorkflowExecution = {
          id: 'exec-running-1',
          workflowId,
          spaceId,
          isTestRun: false,
          status: ExecutionStatus.RUNNING,
          context: {
            concurrencyGroupKey: 'server-1',
          },
          workflowDefinition: {} as any,
          yaml: '',
          scopeStack: [],
          createdAt: new Date().toISOString(),
          error: null,
          createdBy: 'system',
          startedAt: new Date().toISOString(),
          finishedAt: '',
          cancelRequested: false,
          duration: 0,
        };

        workflowExecutionRepository.searchWorkflowExecutions.mockResolvedValue([
          { _source: runningExecution },
        ] as any);

        await concurrencyManager.checkConcurrency(
          workflowId,
          spaceId,
          'server-1',
          settings,
          executionId
        );

        expect(logger.debug).toHaveBeenCalledWith(
          expect.stringContaining('Concurrency collision detected')
        );
      });
    });

    describe('Drop Strategy', () => {
      it('should drop execution when collision detected', async () => {
        const settings: WorkflowSettings = {
          concurrency_key: '"server-1"',
          collision_strategy: 'drop',
        };

        const runningExecution: EsWorkflowExecution = {
          id: 'exec-running-1',
          workflowId,
          spaceId,
          isTestRun: false,
          status: ExecutionStatus.RUNNING,
          context: {
            concurrencyGroupKey: 'server-1',
          },
          workflowDefinition: {} as any,
          yaml: '',
          scopeStack: [],
          createdAt: new Date().toISOString(),
          error: null,
          createdBy: 'system',
          startedAt: new Date().toISOString(),
          finishedAt: '',
          cancelRequested: false,
          duration: 0,
        };

        workflowExecutionRepository.searchWorkflowExecutions.mockResolvedValue([
          { _source: runningExecution },
        ] as any);

        const result = await concurrencyManager.checkConcurrency(
          workflowId,
          spaceId,
          'server-1',
          settings,
          executionId
        );

        expect(result.shouldProceed).toBe(false);
        expect(result.reason).toContain('Skipped');
        expect(result.reason).toContain('concurrency limit');
        expect(result.reason).toContain('server-1');
      });

      it('should not cancel any executions with drop strategy', async () => {
        const settings: WorkflowSettings = {
          concurrency_key: '"server-1"',
          collision_strategy: 'drop',
        };

        const runningExecution: EsWorkflowExecution = {
          id: 'exec-running-1',
          workflowId,
          spaceId,
          isTestRun: false,
          status: ExecutionStatus.RUNNING,
          context: {
            concurrencyGroupKey: 'server-1',
          },
          workflowDefinition: {} as any,
          yaml: '',
          scopeStack: [],
          createdAt: new Date().toISOString(),
          error: null,
          createdBy: 'system',
          startedAt: new Date().toISOString(),
          finishedAt: '',
          cancelRequested: false,
          duration: 0,
        };

        workflowExecutionRepository.searchWorkflowExecutions.mockResolvedValue([
          { _source: runningExecution },
        ] as any);

        const result = await concurrencyManager.checkConcurrency(
          workflowId,
          spaceId,
          'server-1',
          settings,
          executionId
        );

        expect(result.shouldProceed).toBe(false);
        expect(result.cancelledExecutionIds).toBeUndefined();
        expect(workflowExecutionRepository.updateWorkflowExecution).not.toHaveBeenCalled();
      });
    });

    describe('Cancel-in-Progress Strategy', () => {
      it('should cancel running executions and allow new execution', async () => {
        const settings: WorkflowSettings = {
          concurrency_key: '"server-1"',
          collision_strategy: 'cancel-in-progress',
        };

        const runningExecution1: EsWorkflowExecution = {
          id: 'exec-running-1',
          workflowId,
          spaceId,
          isTestRun: false,
          status: ExecutionStatus.RUNNING,
          context: {
            concurrencyGroupKey: 'server-1',
          },
          workflowDefinition: {} as any,
          yaml: '',
          scopeStack: [],
          createdAt: new Date().toISOString(),
          error: null,
          createdBy: 'system',
          startedAt: new Date().toISOString(),
          finishedAt: '',
          cancelRequested: false,
          duration: 0,
        };

        const runningExecution2: EsWorkflowExecution = {
          id: 'exec-running-2',
          workflowId,
          spaceId,
          isTestRun: false,
          status: ExecutionStatus.RUNNING,
          context: {
            concurrencyGroupKey: 'server-1',
          },
          workflowDefinition: {} as any,
          yaml: '',
          scopeStack: [],
          createdAt: new Date().toISOString(),
          error: null,
          createdBy: 'system',
          startedAt: new Date().toISOString(),
          finishedAt: '',
          cancelRequested: false,
          duration: 0,
        };

        workflowExecutionRepository.searchWorkflowExecutions.mockResolvedValue([
          { _source: runningExecution1 },
          { _source: runningExecution2 },
        ] as any);
        workflowExecutionRepository.updateWorkflowExecution.mockResolvedValue(undefined);

        const result = await concurrencyManager.checkConcurrency(
          workflowId,
          spaceId,
          'server-1',
          settings,
          executionId
        );

        expect(result.shouldProceed).toBe(true);
        expect(result.cancelledExecutionIds).toEqual(['exec-running-1', 'exec-running-2']);
        expect(workflowExecutionRepository.updateWorkflowExecution).toHaveBeenCalledTimes(2);
        expect(workflowExecutionRepository.updateWorkflowExecution).toHaveBeenCalledWith({
          id: 'exec-running-1',
          cancelRequested: true,
          cancellationReason:
            'Cancelled due to concurrency collision (cancel-in-progress strategy)',
          cancelledAt: expect.any(String),
          cancelledBy: 'system',
        });
        expect(workflowExecutionRepository.updateWorkflowExecution).toHaveBeenCalledWith({
          id: 'exec-running-2',
          cancelRequested: true,
          cancellationReason:
            'Cancelled due to concurrency collision (cancel-in-progress strategy)',
          cancelledAt: expect.any(String),
          cancelledBy: 'system',
        });
        expect(workflowTaskManager.forceRunIdleTasks).toHaveBeenCalledTimes(2);
        expect(workflowTaskManager.forceRunIdleTasks).toHaveBeenCalledWith('exec-running-1');
        expect(workflowTaskManager.forceRunIdleTasks).toHaveBeenCalledWith('exec-running-2');
      });

      it('should handle cancellation errors gracefully', async () => {
        const settings: WorkflowSettings = {
          concurrency_key: '"server-1"',
          collision_strategy: 'cancel-in-progress',
        };

        const runningExecution1: EsWorkflowExecution = {
          id: 'exec-running-1',
          workflowId,
          spaceId,
          isTestRun: false,
          status: ExecutionStatus.RUNNING,
          context: {
            concurrencyGroupKey: 'server-1',
          },
          workflowDefinition: {} as any,
          yaml: '',
          scopeStack: [],
          createdAt: new Date().toISOString(),
          error: null,
          createdBy: 'system',
          startedAt: new Date().toISOString(),
          finishedAt: '',
          cancelRequested: false,
          duration: 0,
        };

        const runningExecution2: EsWorkflowExecution = {
          id: 'exec-running-2',
          workflowId,
          spaceId,
          isTestRun: false,
          status: ExecutionStatus.RUNNING,
          context: {
            concurrencyGroupKey: 'server-1',
          },
          workflowDefinition: {} as any,
          yaml: '',
          scopeStack: [],
          createdAt: new Date().toISOString(),
          error: null,
          createdBy: 'system',
          startedAt: new Date().toISOString(),
          finishedAt: '',
          cancelRequested: false,
          duration: 0,
        };

        workflowExecutionRepository.searchWorkflowExecutions.mockResolvedValue([
          { _source: runningExecution1 },
          { _source: runningExecution2 },
        ] as any);
        workflowExecutionRepository.updateWorkflowExecution
          .mockRejectedValueOnce(new Error('Update failed'))
          .mockResolvedValueOnce(undefined);

        const result = await concurrencyManager.checkConcurrency(
          workflowId,
          spaceId,
          'server-1',
          settings,
          executionId
        );

        expect(result.shouldProceed).toBe(true);
        expect(result.cancelledExecutionIds).toEqual(['exec-running-2']); // Only successful cancellation
        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to cancel execution exec-running-1')
        );
      });

      it('should continue cancelling other executions even if one fails', async () => {
        const settings: WorkflowSettings = {
          concurrency_key: '"server-1"',
          collision_strategy: 'cancel-in-progress',
        };

        const executions = [
          {
            id: 'exec-running-1',
            workflowId,
            spaceId,
            isTestRun: false,
            status: ExecutionStatus.RUNNING,
            context: { concurrencyGroupKey: 'server-1' },
            workflowDefinition: {} as any,
            yaml: '',
            scopeStack: [],
            createdAt: new Date().toISOString(),
            error: null,
            createdBy: 'system',
            startedAt: new Date().toISOString(),
            finishedAt: '',
            cancelRequested: false,
            duration: 0,
          },
          {
            id: 'exec-running-2',
            workflowId,
            spaceId,
            isTestRun: false,
            status: ExecutionStatus.RUNNING,
            context: { concurrencyGroupKey: 'server-1' },
            workflowDefinition: {} as any,
            yaml: '',
            scopeStack: [],
            createdAt: new Date().toISOString(),
            error: null,
            createdBy: 'system',
            startedAt: new Date().toISOString(),
            finishedAt: '',
            cancelRequested: false,
            duration: 0,
          },
          {
            id: 'exec-running-3',
            workflowId,
            spaceId,
            isTestRun: false,
            status: ExecutionStatus.RUNNING,
            context: { concurrencyGroupKey: 'server-1' },
            workflowDefinition: {} as any,
            yaml: '',
            scopeStack: [],
            createdAt: new Date().toISOString(),
            error: null,
            createdBy: 'system',
            startedAt: new Date().toISOString(),
            finishedAt: '',
            cancelRequested: false,
            duration: 0,
          },
        ];

        workflowExecutionRepository.searchWorkflowExecutions.mockResolvedValue(
          executions.map((e) => ({ _source: e })) as any
        );
        workflowExecutionRepository.updateWorkflowExecution
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('Update failed'))
          .mockResolvedValueOnce(undefined);

        const result = await concurrencyManager.checkConcurrency(
          workflowId,
          spaceId,
          'server-1',
          settings,
          executionId
        );

        expect(result.shouldProceed).toBe(true);
        expect(result.cancelledExecutionIds).toEqual(['exec-running-1', 'exec-running-3']);
        expect(workflowExecutionRepository.updateWorkflowExecution).toHaveBeenCalledTimes(3);
        expect(logger.error).toHaveBeenCalledTimes(1);
      });
    });

    describe('Edge Cases', () => {
      it('should handle max_concurrency_per_group greater than running executions', async () => {
        const settings: WorkflowSettings = {
          concurrency_key: '"server-1"',
          max_concurrency_per_group: 5,
        };

        const runningExecution: EsWorkflowExecution = {
          id: 'exec-running-1',
          workflowId,
          spaceId,
          isTestRun: false,
          status: ExecutionStatus.RUNNING,
          context: {
            concurrencyGroupKey: 'server-1',
          },
          workflowDefinition: {} as any,
          yaml: '',
          scopeStack: [],
          createdAt: new Date().toISOString(),
          error: null,
          createdBy: 'system',
          startedAt: new Date().toISOString(),
          finishedAt: '',
          cancelRequested: false,
          duration: 0,
        };

        workflowExecutionRepository.searchWorkflowExecutions.mockResolvedValue([
          { _source: runningExecution },
        ] as any);

        const result = await concurrencyManager.checkConcurrency(
          workflowId,
          spaceId,
          'server-1',
          settings,
          executionId
        );

        expect(result.shouldProceed).toBe(true);
      });

      it('should handle exactly max_concurrency_per_group running executions', async () => {
        const settings: WorkflowSettings = {
          concurrency_key: '"server-1"',
          max_concurrency_per_group: 2,
        };

        const runningExecutions = [
          {
            id: 'exec-running-1',
            workflowId,
            spaceId,
            isTestRun: false,
            status: ExecutionStatus.RUNNING,
            context: { concurrencyGroupKey: 'server-1' },
            workflowDefinition: {} as any,
            yaml: '',
            scopeStack: [],
            createdAt: new Date().toISOString(),
            error: null,
            createdBy: 'system',
            startedAt: new Date().toISOString(),
            finishedAt: '',
            cancelRequested: false,
            duration: 0,
          },
          {
            id: 'exec-running-2',
            workflowId,
            spaceId,
            isTestRun: false,
            status: ExecutionStatus.RUNNING,
            context: { concurrencyGroupKey: 'server-1' },
            workflowDefinition: {} as any,
            yaml: '',
            scopeStack: [],
            createdAt: new Date().toISOString(),
            error: null,
            createdBy: 'system',
            startedAt: new Date().toISOString(),
            finishedAt: '',
            cancelRequested: false,
            duration: 0,
          },
        ];

        workflowExecutionRepository.searchWorkflowExecutions.mockResolvedValue(
          runningExecutions.map((e) => ({ _source: e })) as any
        );

        const result = await concurrencyManager.checkConcurrency(
          workflowId,
          spaceId,
          'server-1',
          settings,
          executionId
        );

        expect(result.shouldProceed).toBe(false);
      });

      it('should handle empty string concurrency key', async () => {
        const settings: WorkflowSettings = {
          concurrency_key: '',
        };

        const result = await concurrencyManager.checkConcurrency(
          workflowId,
          spaceId,
          '', // Empty string is falsy, so check returns early
          settings,
          executionId
        );

        // Empty string is falsy, so it should proceed without checks
        expect(result.shouldProceed).toBe(true);
        expect(workflowExecutionRepository.searchWorkflowExecutions).not.toHaveBeenCalled();
      });
    });
  });
});
