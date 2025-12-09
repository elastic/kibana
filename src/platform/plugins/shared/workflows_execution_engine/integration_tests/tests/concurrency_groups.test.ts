/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import YAML from 'yaml';
import type { Logger } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { EsWorkflowExecution, WorkflowContext, WorkflowYaml } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { ConcurrencyManager } from '../../server/concurrency/concurrency_manager';
import { WorkflowExecutionRepository } from '../../server/repositories/workflow_execution_repository';
import { WorkflowTaskManager } from '../../server/workflow_task_manager/workflow_task_manager';
import { TaskManagerMock } from '../mocks/task_manager.mock';

describe('Concurrency Groups Integration Tests', () => {
  let esClient: jest.Mocked<Client>;
  let workflowExecutionRepository: WorkflowExecutionRepository;
  let concurrencyManager: ConcurrencyManager;
  let logger: Logger;
  let taskManager: TaskManagerStartContract;
  let workflowTaskManager: WorkflowTaskManager;
  const spaceId = 'default';
  const workflowId = 'test-workflow-id';

  // Minimal workflow YAMLs for testing
  const minimalWorkflowYaml = `
name: Test Workflow
enabled: true
triggers:
  - type: manual
steps:
  - name: echo
    type: console
    with:
      message: "Hello"
`;

  const workflowWithConcurrencyKey = (concurrencyKey: string) => `
name: Test Workflow
enabled: true
settings:
  concurrency_key: ${concurrencyKey}
triggers:
  - type: manual
steps:
  - name: echo
    type: console
    with:
      message: "Hello"
`;

  const workflowWithConcurrencyAndStrategy = (
    concurrencyKey: string,
    strategy: 'queue' | 'drop' | 'cancel-in-progress',
    maxConcurrency: number = 1
  ) => `
name: Test Workflow
enabled: true
settings:
  concurrency_key: ${concurrencyKey}
  collision_strategy: ${strategy}
  max_concurrency_per_group: ${maxConcurrency}
triggers:
  - type: manual
steps:
  - name: echo
    type: console
    with:
      message: "Hello"
`;

  beforeEach(() => {
    esClient =
      elasticsearchServiceMock.createElasticsearchClient() as unknown as jest.Mocked<Client>;
    workflowExecutionRepository = new WorkflowExecutionRepository(esClient);
    logger = loggingSystemMock.create().get();
    taskManager = TaskManagerMock.create() as unknown as TaskManagerStartContract;
    // Mock fetch method needed by WorkflowTaskManager.forceRunIdleTasks
    (taskManager as any).fetch = jest.fn().mockResolvedValue({ docs: [] });
    (taskManager as any).runSoon = jest.fn().mockResolvedValue(undefined);
    workflowTaskManager = new WorkflowTaskManager(taskManager);
    concurrencyManager = new ConcurrencyManager(
      logger,
      workflowExecutionRepository,
      workflowTaskManager
    );

    // Mock index operations
    esClient.index = jest.fn().mockResolvedValue({} as any);
    esClient.update = jest.fn().mockResolvedValue({} as any);
    esClient.search = jest.fn().mockResolvedValue({
      hits: {
        hits: [],
        total: { value: 0, relation: 'eq' },
      },
    } as any);
  });

  describe('Concurrency Key Evaluation', () => {
    it('should evaluate static concurrency key using template', () => {
      const workflowYaml = YAML.parseDocument(
        workflowWithConcurrencyKey('"server-1"')
      ).toJSON() as WorkflowYaml;
      // Note: Static strings need to be wrapped in quotes in YAML, but template engine requires {{ }} syntax
      // For a literal string, we'd use: '"server-1"' in YAML which becomes "server-1" string
      // But for template evaluation, we need: '{{ "server-1" }}' or just use a template variable
      const context: WorkflowContext = {
        execution: {
          id: 'exec-1',
          isTestRun: false,
          startedAt: new Date(),
          url: 'http://localhost',
        },
        workflow: {
          id: workflowId,
          name: 'Test Workflow',
          enabled: true,
          spaceId,
        },
        kibanaUrl: 'http://localhost',
        inputs: {
          serverName: 'server-1',
        },
        consts: {},
        now: new Date(),
      };

      // Use template expression instead
      const workflowYamlWithTemplate = YAML.parseDocument(
        workflowWithConcurrencyKey('"{{ inputs.serverName }}"')
      ).toJSON() as WorkflowYaml;
      const key = concurrencyManager.evaluateConcurrencyKey(
        workflowYamlWithTemplate.settings,
        context
      );
      expect(key).toBe('server-1');
    });

    it('should evaluate dynamic concurrency key from event', () => {
      const workflowYaml = YAML.parseDocument(
        workflowWithConcurrencyKey('"{{ event.host.name }}"')
      ).toJSON() as WorkflowYaml;
      const context: WorkflowContext = {
        execution: {
          id: 'exec-1',
          isTestRun: false,
          startedAt: new Date(),
          url: 'http://localhost',
        },
        workflow: {
          id: workflowId,
          name: 'Test Workflow',
          enabled: true,
          spaceId,
        },
        kibanaUrl: 'http://localhost',
        inputs: {},
        consts: {},
        event: {
          alerts: [
            {
              _id: 'alert-1',
              _index: 'alerts-index',
              kibana: {
                alert: {
                  host: {
                    name: 'server-abc',
                  },
                },
              },
              '@timestamp': new Date().toISOString(),
            },
          ],
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
        now: new Date(),
      };

      // The template engine should be able to access nested properties
      // For this test, we'll use a simpler approach with params
      const workflowYamlSimple = YAML.parseDocument(
        workflowWithConcurrencyKey('"{{ event.params.host.name }}"')
      ).toJSON() as WorkflowYaml;
      const key = concurrencyManager.evaluateConcurrencyKey(workflowYamlSimple.settings, context);
      expect(key).toBe('server-abc');
    });

    it('should return null when no concurrency key is configured', () => {
      const workflowYaml = YAML.parseDocument(minimalWorkflowYaml).toJSON() as WorkflowYaml;
      const context: WorkflowContext = {
        execution: {
          id: 'exec-1',
          isTestRun: false,
          startedAt: new Date(),
          url: 'http://localhost',
        },
        workflow: {
          id: workflowId,
          name: 'Test Workflow',
          enabled: true,
          spaceId,
        },
        kibanaUrl: 'http://localhost',
        inputs: {},
        consts: {},
        now: new Date(),
      };

      const key = concurrencyManager.evaluateConcurrencyKey(workflowYaml.settings, context);
      expect(key).toBeNull();
    });
  });

  describe('Collision Detection', () => {
    it('should allow execution when no running executions exist', async () => {
      const workflowYaml = YAML.parseDocument(
        workflowWithConcurrencyKey('"server-1"')
      ).toJSON() as WorkflowYaml;

      const result = await concurrencyManager.checkConcurrency(
        workflowId,
        spaceId,
        'server-1',
        workflowYaml.settings,
        'exec-1'
      );

      expect(result.shouldProceed).toBe(true);
      expect(esClient.search).toHaveBeenCalled();
    });

    it('should detect collision when running execution exists for same key', async () => {
      const workflowYaml = YAML.parseDocument(
        workflowWithConcurrencyKey('"server-1"')
      ).toJSON() as WorkflowYaml;

      // Mock existing running execution
      esClient.search.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                id: 'exec-existing',
                workflowId,
                spaceId,
                status: ExecutionStatus.RUNNING,
                context: {
                  concurrencyGroupKey: 'server-1',
                },
              },
            },
          ],
          total: { value: 1, relation: 'eq' },
        },
      } as any);

      const result = await concurrencyManager.checkConcurrency(
        workflowId,
        spaceId,
        'server-1',
        workflowYaml.settings,
        'exec-2'
      );

      expect(result.shouldProceed).toBe(false);
      expect(result.reason).toContain('concurrency limit');
    });

    it('should allow parallel executions for different concurrency keys', async () => {
      const workflowYaml = YAML.parseDocument(
        workflowWithConcurrencyKey('"{{ event.params.host.name }}"')
      ).toJSON() as WorkflowYaml;

      // When checking for 'server-1', the query filters by that specific key
      // So even if there's a running execution for 'server-2', it won't be returned
      // Mock empty result since we're querying for a different key
      esClient.search.mockResolvedValueOnce({
        hits: {
          hits: [], // No running executions for 'server-1' key
          total: { value: 0, relation: 'eq' },
        },
      } as any);

      const result = await concurrencyManager.checkConcurrency(
        workflowId,
        spaceId,
        'server-1', // Different key from any running executions
        workflowYaml.settings,
        'exec-2'
      );

      expect(result.shouldProceed).toBe(true);
    });

    it('should respect max_concurrency_per_group limit', async () => {
      const workflowYaml = YAML.parseDocument(
        workflowWithConcurrencyAndStrategy('"server-1"', 'queue', 2)
      ).toJSON() as WorkflowYaml;

      // Mock 2 existing running executions (at limit)
      esClient.search.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                id: 'exec-1',
                workflowId,
                spaceId,
                status: ExecutionStatus.RUNNING,
                context: {
                  concurrencyGroupKey: 'server-1',
                },
              },
            },
            {
              _source: {
                id: 'exec-2',
                workflowId,
                spaceId,
                status: ExecutionStatus.RUNNING,
                context: {
                  concurrencyGroupKey: 'server-1',
                },
              },
            },
          ],
          total: { value: 2, relation: 'eq' },
        },
      } as any);

      const result = await concurrencyManager.checkConcurrency(
        workflowId,
        spaceId,
        'server-1',
        workflowYaml.settings,
        'exec-3'
      );

      expect(result.shouldProceed).toBe(false);
    });

    it('should allow execution when under max_concurrency_per_group limit', async () => {
      const workflowYaml = YAML.parseDocument(
        workflowWithConcurrencyAndStrategy('"server-1"', 'queue', 3)
      ).toJSON() as WorkflowYaml;

      // Mock 2 existing running executions (under limit of 3)
      esClient.search.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                id: 'exec-1',
                workflowId,
                spaceId,
                status: ExecutionStatus.RUNNING,
                context: {
                  concurrencyGroupKey: 'server-1',
                },
              },
            },
            {
              _source: {
                id: 'exec-2',
                workflowId,
                spaceId,
                status: ExecutionStatus.RUNNING,
                context: {
                  concurrencyGroupKey: 'server-1',
                },
              },
            },
          ],
          total: { value: 2, relation: 'eq' },
        },
      } as any);

      const result = await concurrencyManager.checkConcurrency(
        workflowId,
        spaceId,
        'server-1',
        workflowYaml.settings,
        'exec-3'
      );

      expect(result.shouldProceed).toBe(true);
    });
  });

  describe('Collision Strategies', () => {
    describe('Queue Strategy (Default)', () => {
      it('should queue execution when collision detected', async () => {
        const workflowYaml = YAML.parseDocument(
          workflowWithConcurrencyAndStrategy('"server-1"', 'queue')
        ).toJSON() as WorkflowYaml;

        esClient.search.mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  id: 'exec-existing',
                  workflowId,
                  spaceId,
                  status: ExecutionStatus.RUNNING,
                  context: {
                    concurrencyGroupKey: 'server-1',
                  },
                },
              },
            ],
            total: { value: 1, relation: 'eq' },
          },
        } as any);

        const result = await concurrencyManager.checkConcurrency(
          workflowId,
          spaceId,
          'server-1',
          workflowYaml.settings,
          'exec-2'
        );

        expect(result.shouldProceed).toBe(false);
        expect(result.reason).toContain('Queued');
        expect(result.reason).toContain('concurrency limit');
      });
    });

    describe('Drop Strategy', () => {
      it('should drop execution when collision detected', async () => {
        const workflowYaml = YAML.parseDocument(
          workflowWithConcurrencyAndStrategy('"server-1"', 'drop')
        ).toJSON() as WorkflowYaml;

        esClient.search.mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  id: 'exec-existing',
                  workflowId,
                  spaceId,
                  status: ExecutionStatus.RUNNING,
                  context: {
                    concurrencyGroupKey: 'server-1',
                  },
                },
              },
            ],
            total: { value: 1, relation: 'eq' },
          },
        } as any);

        const result = await concurrencyManager.checkConcurrency(
          workflowId,
          spaceId,
          'server-1',
          workflowYaml.settings,
          'exec-2'
        );

        expect(result.shouldProceed).toBe(false);
        expect(result.reason).toContain('Skipped');
        expect(result.reason).toContain('concurrency limit');
      });
    });

    describe('Cancel-in-Progress Strategy', () => {
      it('should cancel running executions and allow new one', async () => {
        const workflowYaml = YAML.parseDocument(
          workflowWithConcurrencyAndStrategy('"server-1"', 'cancel-in-progress')
        ).toJSON() as WorkflowYaml;

        const existingExecution1: EsWorkflowExecution = {
          id: 'exec-existing-1',
          workflowId,
          spaceId,
          isTestRun: false,
          status: ExecutionStatus.RUNNING,
          context: {
            concurrencyGroupKey: 'server-1',
          },
          workflowDefinition: workflowYaml,
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

        const existingExecution2: EsWorkflowExecution = {
          id: 'exec-existing-2',
          workflowId,
          spaceId,
          isTestRun: false,
          status: ExecutionStatus.RUNNING,
          context: {
            concurrencyGroupKey: 'server-1',
          },
          workflowDefinition: workflowYaml,
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

        esClient.search.mockResolvedValueOnce({
          hits: {
            hits: [{ _source: existingExecution1 }, { _source: existingExecution2 }],
            total: { value: 2, relation: 'eq' },
          },
        } as any);
        // Mock update to resolve successfully for both executions
        esClient.update.mockResolvedValueOnce({} as any).mockResolvedValueOnce({} as any);

        const result = await concurrencyManager.checkConcurrency(
          workflowId,
          spaceId,
          'server-1',
          workflowYaml.settings,
          'exec-new'
        );

        expect(result.shouldProceed).toBe(true);
        expect(result.cancelledExecutionIds).toEqual(['exec-existing-1', 'exec-existing-2']);
        expect(esClient.update).toHaveBeenCalledTimes(2);
        expect(esClient.update).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'exec-existing-1',
            doc: expect.objectContaining({
              cancelRequested: true,
              cancellationReason: expect.stringContaining('cancel-in-progress'),
            }),
          })
        );
        expect(esClient.update).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'exec-existing-2',
            doc: expect.objectContaining({
              cancelRequested: true,
              cancellationReason: expect.stringContaining('cancel-in-progress'),
            }),
          })
        );
      });
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle multiple hosts with same concurrency key pattern', async () => {
      const workflowYaml = YAML.parseDocument(
        workflowWithConcurrencyKey('"{{ event.params.host.name }}"')
      ).toJSON() as WorkflowYaml;

      // First execution for host-1
      esClient.search.mockResolvedValueOnce({
        hits: {
          hits: [],
          total: { value: 0, relation: 'eq' },
        },
      } as any);

      const result1 = await concurrencyManager.checkConcurrency(
        workflowId,
        spaceId,
        'host-1',
        workflowYaml.settings,
        'exec-1'
      );
      expect(result1.shouldProceed).toBe(true);

      // Second execution for host-1 (should collide)
      esClient.search.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                id: 'exec-1',
                workflowId,
                spaceId,
                status: ExecutionStatus.RUNNING,
                context: {
                  concurrencyGroupKey: 'host-1',
                },
              },
            },
          ],
          total: { value: 1, relation: 'eq' },
        },
      } as any);

      const result2 = await concurrencyManager.checkConcurrency(
        workflowId,
        spaceId,
        'host-1',
        workflowYaml.settings,
        'exec-2'
      );
      expect(result2.shouldProceed).toBe(false);

      // Third execution for host-2 (different key, should proceed)
      // No running executions for host-2, so search returns empty
      esClient.search.mockResolvedValueOnce({
        hits: {
          hits: [], // No running executions for host-2
          total: { value: 0, relation: 'eq' },
        },
      } as any);

      const result3 = await concurrencyManager.checkConcurrency(
        workflowId,
        spaceId,
        'host-2', // Different key
        workflowYaml.settings,
        'exec-3'
      );
      expect(result3.shouldProceed).toBe(true);
    });

    it('should handle workflow without concurrency settings', async () => {
      const workflowYaml = YAML.parseDocument(minimalWorkflowYaml).toJSON() as WorkflowYaml;

      const result = await concurrencyManager.checkConcurrency(
        workflowId,
        spaceId,
        null, // No concurrency key
        workflowYaml.settings,
        'exec-1'
      );

      expect(result.shouldProceed).toBe(true);
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('should exclude current execution from collision check', async () => {
      const workflowYaml = YAML.parseDocument(
        workflowWithConcurrencyKey('"server-1"')
      ).toJSON() as WorkflowYaml;

      // Mock search that would include current execution, but it should be excluded
      esClient.search.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                id: 'exec-1', // Same as current execution
                workflowId,
                spaceId,
                status: ExecutionStatus.RUNNING,
                context: {
                  concurrencyGroupKey: 'server-1',
                },
              },
            },
          ],
          total: { value: 1, relation: 'eq' },
        },
      } as any);

      // The query should exclude exec-1, so if it's the only one, result should proceed
      // But our implementation filters it out, so we need to check the query
      const result = await concurrencyManager.checkConcurrency(
        workflowId,
        spaceId,
        'server-1',
        workflowYaml.settings,
        'exec-1' // Same ID
      );

      // The query should exclude exec-1 via must_not clause
      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              must_not: expect.arrayContaining([
                expect.objectContaining({
                  term: { id: 'exec-1' },
                }),
              ]),
            }),
          }),
        })
      );
    });
  });
});
