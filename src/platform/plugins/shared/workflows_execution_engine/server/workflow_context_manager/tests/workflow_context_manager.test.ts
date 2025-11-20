/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloudMock } from '@kbn/cloud-plugin/server/mocks';
import type {
  ConnectorStep,
  EsWorkflowExecution,
  EsWorkflowStepExecution,
  ForEachStep,
  StackFrame,
  WorkflowYaml,
} from '@kbn/workflows';
import type { AtomicGraphNode } from '@kbn/workflows/graph';
import { WorkflowGraph } from '@kbn/workflows/graph';
import type { WorkflowTemplatingEngine } from '../../templating_engine';
import type { ContextDependencies } from '../types';
import { WorkflowContextManager } from '../workflow_context_manager';
import type { WorkflowExecutionState } from '../workflow_execution_state';

const cloudSetupMock = cloudMock.createSetup();
const dependencies: ContextDependencies = {
  cloudSetup: cloudSetupMock,
};

jest.mock('../../utils', () => ({
  buildStepExecutionId: jest.fn().mockImplementation((executionId, stepId, path) => {
    return `${stepId}_generated`;
  }),
  getKibanaUrl: jest.fn().mockReturnValue('http://localhost:5601'),
  buildWorkflowExecutionUrl: jest
    .fn()
    .mockImplementation((kibanaUrl, spaceId, workflowId, executionId, stepExecutionId) => {
      const spacePrefix = spaceId === 'default' ? '' : `/s/${spaceId}`;
      const baseUrl = `${kibanaUrl}${spacePrefix}/app/workflows/${workflowId}`;
      const params = new URLSearchParams({
        executionId,
        tab: 'executions',
      });
      if (stepExecutionId) {
        params.set('stepExecutionId', stepExecutionId);
      }
      return `${baseUrl}?${params.toString()}`;
    }),
}));

describe('WorkflowContextManager', () => {
  const fakeNode: AtomicGraphNode = {
    id: 'testStep',
    type: 'atomic',
    stepId: 'fake_id',
    stepType: 'fake_type',
  };
  const fakeStackFrames: StackFrame[] = [];

  function createTestContainer(workflow: WorkflowYaml) {
    const workflowExecutionGraph = WorkflowGraph.fromWorkflowDefinition(workflow);
    const workflowExecutionState: WorkflowExecutionState = {} as WorkflowExecutionState;
    workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
      scopeStack: [] as StackFrame[],
      workflowDefinition: workflow,
    } as EsWorkflowExecution);
    workflowExecutionState.getStepExecution = jest
      .fn()
      .mockReturnValue({} as EsWorkflowStepExecution);
    workflowExecutionState.getLatestStepExecution = jest
      .fn()
      .mockReturnValue({} as EsWorkflowStepExecution);
    const templatingEngineMock = {} as unknown as WorkflowTemplatingEngine;
    templatingEngineMock.render = jest.fn().mockImplementation((template) => template);

    // Provide a dummy esClient as required by ContextManagerInit
    const esClient = {
      // Add only the minimal mock implementation needed for tests
      search: jest.fn(),
      index: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    const underTest = new WorkflowContextManager({
      templateEngine: templatingEngineMock,
      node: fakeNode as AtomicGraphNode,
      stackFrames: fakeStackFrames,
      workflowExecutionGraph,
      workflowExecutionState,
      esClient,
      dependencies,
    });

    return {
      workflowExecutionGraph,
      workflowExecutionState,
      underTest,
      esClient,
      templatingEngineMock,
    };
  }

  describe('consts', () => {
    const workflow: WorkflowYaml = {
      name: 'Test Workflow',
      version: '1',
      description: 'A test workflow',
      enabled: true,
      consts: {
        CONST_1: 'value1',
        CONST_2: 42,
      },
      triggers: [],
      steps: [],
    };
    let testContainer: ReturnType<typeof createTestContainer>;

    beforeEach(() => {
      testContainer = createTestContainer(workflow);
    });

    it('should have consts from workflow', () => {
      const stepContext = testContainer.underTest.getContext();
      expect(stepContext.consts).toEqual({
        CONST_1: 'value1',
        CONST_2: 42,
      });
    });

    it('should override consts with mocked data', () => {
      testContainer.workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        workflowDefinition: workflow,
        scopeStack: [] as StackFrame[],
        context: {
          contextOverride: {
            consts: {
              CONST_2: 900,
              NEW_CONST: 'new const',
            },
          },
        } as Record<string, any>,
      } as EsWorkflowExecution);

      const context = testContainer.underTest.getContext();
      expect(context.consts).toEqual({
        CONST_1: 'value1',
        CONST_2: 900,
        NEW_CONST: 'new const',
      });
    });
  });

  describe('event', () => {
    const workflow: WorkflowYaml = {
      name: 'Test Workflow',
      version: '1',
      description: 'A test workflow',
      enabled: true,
      consts: {},
      triggers: [],
      steps: [],
    };
    let testContainer: ReturnType<typeof createTestContainer>;

    beforeEach(() => {
      testContainer = createTestContainer(workflow);
    });

    it('should have event from execution context', () => {
      testContainer.workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        scopeStack: [] as StackFrame[],
        workflowDefinition: workflow,
        context: {
          event: {
            name: 'alert',
            severity: 'high',
          },
        } as Record<string, any>,
      } as EsWorkflowExecution);
      const stepContext = testContainer.underTest.getContext();
      expect(stepContext.event).toEqual({
        name: 'alert',
        severity: 'high',
      });
    });

    it('should override event context with mocked data', () => {
      testContainer.workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        workflowDefinition: workflow,
        scopeStack: [] as StackFrame[],
        context: {
          contextOverride: {
            event: {
              alert: {
                name: 'Vulnerability',
              },
            },
          },
        } as Record<string, any>,
      } as EsWorkflowExecution);

      const context = testContainer.underTest.getContext();
      expect(context.event).toEqual({
        alert: {
          name: 'Vulnerability',
        },
      });
    });
  });

  describe('inputs', () => {
    const workflow: WorkflowYaml = {
      name: 'Test Workflow',
      version: '1',
      description: 'A test workflow',
      enabled: true,
      consts: {},
      triggers: [],
      steps: [],
      inputs: [
        {
          name: 'name',
          type: 'string',
          required: false,
          default: '',
        },
      ],
    };
    let testContainer: ReturnType<typeof createTestContainer>;

    beforeEach(() => {
      testContainer = createTestContainer(workflow);
    });

    it('should have inputs from execution context', () => {
      testContainer.workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        scopeStack: [] as StackFrame[],
        workflowDefinition: workflow,
        context: {
          inputs: {
            name: 'test',
          },
        } as Record<string, any>,
      } as EsWorkflowExecution);
      const stepContext = testContainer.underTest.getContext();
      expect(stepContext.inputs).toEqual({
        name: 'test',
      });
    });

    it('should override inputs from mock', () => {
      testContainer.workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        workflowDefinition: workflow,
        scopeStack: [] as StackFrame[],
        context: {
          inputs: {
            remainingKey: 'some string',
            overridenKey: true,
          },
          contextOverride: {
            inputs: {
              overridenKey: false,
              newKey: 123,
            },
          },
        } as Record<string, any>,
      } as EsWorkflowExecution);

      const context = testContainer.underTest.getContext();
      expect(context.inputs).toEqual({
        remainingKey: 'some string',
        overridenKey: false,
        newKey: 123,
      });
    });
  });

  describe('workflow context', () => {
    let testContainer: ReturnType<typeof createTestContainer>;
    const workflow: WorkflowYaml = {
      name: 'Test Workflow',
      version: '1',
      description: 'A test workflow',
      enabled: true,
      consts: {},
      triggers: [],
      steps: [],
    };

    beforeEach(() => {
      testContainer = createTestContainer(workflow);
      testContainer.workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        workflowDefinition: workflow,
        workflowId: 'fake-workflow-id',
        spaceId: 'fake-space-id',
        scopeStack: [] as StackFrame[],
      } as EsWorkflowExecution);
    });

    it('should return workflow id in workflow context', () => {
      const context = testContainer.underTest.getContext();
      expect(context.workflow.id).toBe('fake-workflow-id');
    });

    it('should return spaceId in workflow context', () => {
      const context = testContainer.underTest.getContext();
      expect(context.workflow.spaceId).toBe('fake-space-id');
    });

    it('should return workflow name in workflow context', () => {
      const context = testContainer.underTest.getContext();
      expect(context.workflow.name).toBe('Test Workflow');
    });

    describe('enabled flag', () => {
      it('should return true in enabled flag if workflow is enabled', () => {
        workflow.enabled = true;
        const context = testContainer.underTest.getContext();
        expect(context.workflow.enabled).toBe(true);
      });

      it('should return false in enabled flag if workflow is disabled', () => {
        workflow.enabled = false;
        const context = testContainer.underTest.getContext();
        expect(context.workflow.enabled).toBe(false);
      });
    });

    it('should override workflow context with mocked data', () => {
      testContainer.workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        workflowDefinition: workflow,
        workflowId: 'fake-workflow-id',
        spaceId: 'fake-space-id',
        scopeStack: [] as StackFrame[],
        context: {
          contextOverride: {
            workflow: {
              id: 'mocked-workflow-id',
              name: 'Mocked Workflow Name',
              enabled: false,
              spaceId: 'mocked-space-id',
            },
          },
        } as Record<string, any>,
      } as EsWorkflowExecution);

      const context = testContainer.underTest.getContext();
      expect(context.workflow.id).toBe('mocked-workflow-id');
      expect(context.workflow.name).toBe('Mocked Workflow Name');
      expect(context.workflow.enabled).toBe(false);
      expect(context.workflow.spaceId).toBe('mocked-space-id');
    });
  });

  describe('execution context', () => {
    let testContainer: ReturnType<typeof createTestContainer>;
    const workflow: WorkflowYaml = {
      name: 'Test Workflow',
      version: '1',
      description: 'A test workflow',
      enabled: true,
      consts: {},
      triggers: [],
      steps: [],
    };

    beforeEach(() => {
      testContainer = createTestContainer(workflow);
      testContainer.workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        workflowDefinition: workflow,
        id: 'fake-execution-id',
        scopeStack: [] as StackFrame[],
        startedAt: new Date('2023-01-01T00:00:00Z').toISOString(),
      } as EsWorkflowExecution);
    });

    it('should return execution id in execution context', () => {
      const context = testContainer.underTest.getContext();
      expect(context.execution.id).toBe('fake-execution-id');
    });

    it('should return startedAt', () => {
      const context = testContainer.underTest.getContext();
      expect(context.execution.startedAt).toEqual(new Date('2023-01-01T00:00:00Z'));
    });

    describe('isTestRun flag', () => {
      it('should return true in isTestRun flag if isTestRun in workflow execution is true', () => {
        testContainer.workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
          workflowDefinition: workflow,
          scopeStack: [] as StackFrame[],
          isTestRun: true,
        } as EsWorkflowExecution);
        const context = testContainer.underTest.getContext();
        expect(context.execution.isTestRun).toBe(true);
      });

      it.each([undefined, null, false])(
        'should return false in isTestRun flag if isTestRun in workflow execution is %s',
        (isTestRun) => {
          testContainer.workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
            workflowDefinition: workflow,
            scopeStack: [] as StackFrame[],
            isTestRun,
          } as EsWorkflowExecution);
          const context = testContainer.underTest.getContext();
          expect(context.execution.isTestRun).toBe(false);
        }
      );

      it('should enrich execution context with mocked data', () => {
        testContainer.workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
          workflowDefinition: workflow,
          id: 'fake-execution-id',
          scopeStack: [] as StackFrame[],
          startedAt: new Date('2023-01-01T00:00:00Z').toISOString(),
          context: {
            contextOverride: {
              execution: {
                id: 'mocked-execution-id',
                isTestRun: true,
                startedAt: new Date('2024-01-01T00:00:00Z'),
              },
            },
          } as Record<string, any>,
        } as EsWorkflowExecution);

        const context = testContainer.underTest.getContext();
        expect(context.execution.id).toBe('mocked-execution-id');
        expect(context.execution.isTestRun).toBe(true);
        expect(context.execution.startedAt).toEqual(new Date('2024-01-01T00:00:00Z'));
      });
    });
  });

  describe('foreach scope state', () => {
    const workflow: WorkflowYaml = {
      name: 'Test Workflow',
      version: '1',
      description: 'A test workflow',
      enabled: true,
      consts: {},
      triggers: [],
      steps: [
        {
          name: 'outerForeachStep',
          type: 'foreach',
          foreach: JSON.stringify(['item1', 'item2', 'item3']),
          steps: [
            {
              name: 'innerForeachStep',
              type: 'foreach',
              foreach: JSON.stringify(['1', '2', '3']),
              steps: [
                {
                  name: 'innerLogStep',
                  type: 'console',
                  with: {
                    message: 'Anything',
                  },
                } as ConnectorStep,
              ],
            } as ForEachStep,
          ],
        } as ForEachStep,
        {
          name: 'lastLogStep',
          type: 'console',
          with: {
            message: 'Anything',
          },
        } as ConnectorStep,
      ],
    };
    let testContainer: ReturnType<typeof createTestContainer>;

    beforeEach(() => {
      testContainer = createTestContainer(workflow);
    });

    it('should have foreach equal to the inner foreach step state for step innerLogStep', () => {
      testContainer.workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        workflowDefinition: workflow,
        scopeStack: [
          {
            stepId: 'outerForeachStep',
            nestedScopes: [{ nodeId: 'enterForeach_outerForeachStep' }],
          },
          {
            stepId: 'innerForeachStep',
            nestedScopes: [{ nodeId: 'enterForeach_innerForeachStep' }],
          },
        ],
      } as EsWorkflowExecution);
      testContainer.workflowExecutionState.getStepExecution = jest
        .fn()
        .mockImplementation((stepExecutionId) => {
          if (stepExecutionId === 'outerForeachStep_generated') {
            return {
              stepType: 'foreach',
              state: {
                items: ['item1', 'item2', 'item3'],
                index: 0,
                item: 'item1',
                total: 3,
              },
            };
          }

          if (stepExecutionId === 'innerForeachStep_generated') {
            return {
              stepType: 'foreach',
              state: {
                items: ['1', '2', '3', '4'],
                index: 1,
                item: '2',
                total: 4,
              },
            };
          }
          return undefined;
        });

      const context = testContainer.underTest.getContext();
      expect(context.foreach).toEqual({
        items: ['1', '2', '3', '4'],
        index: 1,
        item: '2',
        total: 4,
      });
    });

    it('should have foreach scope undefined for step lastLogStep', () => {
      testContainer.workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        workflowDefinition: workflow,
        scopeStack: [] as StackFrame[],
      } as EsWorkflowExecution);

      const context = testContainer.underTest.getContext();
      expect(context.foreach).toBeUndefined();
    });

    it('should override foreach context', () => {
      testContainer.workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        workflowDefinition: workflow,
        scopeStack: [] as StackFrame[],
        context: {
          inputs: {
            remainingKey: 'some string',
            overridenKey: true,
          },
          contextOverride: {
            foreach: {
              item: 'fake',
              index: 200,
              total: 100500,
            },
          },
        } as Record<string, any>,
      } as EsWorkflowExecution);

      const context = testContainer.underTest.getContext();
      expect(context.foreach).toEqual({
        item: 'fake',
        index: 200,
        total: 100500,
      });
    });

    it('should not override foreach context if contextOverride.foreach is not present', () => {
      testContainer.workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        workflowDefinition: workflow,
        scopeStack: [
          {
            stepId: 'outerForeachStep',
            nestedScopes: [{ nodeId: 'enterForeach_outerForeachStep' }],
          },
        ] as StackFrame[],
        context: {
          contextOverride: {
            foreach: {
              item: 'fake',
              index: 200,
              total: 100500,
            },
          },
        } as Record<string, any>,
      } as EsWorkflowExecution);
      testContainer.workflowExecutionState.getStepExecution = jest
        .fn()
        .mockImplementation((stepExecutionId) => {
          if (stepExecutionId === 'outerForeachStep_generated') {
            return {
              stepType: 'foreach',
              state: {
                items: ['item1', 'item2', 'item3'],
                index: 0,
                item: 'item1',
                total: 3,
              },
            };
          }
          return undefined;
        });

      const context = testContainer.underTest.getContext();
      expect(context.foreach).toEqual({
        items: ['item1', 'item2', 'item3'],
        index: 0,
        item: 'item1',
        total: 3,
      });
    });
  });

  describe('steps context', () => {
    const workflow: WorkflowYaml = {
      name: 'Test Workflow',
      version: '1',
      description: 'A test workflow',
      enabled: true,
      consts: {},
      triggers: [],
      steps: [
        {
          name: 'firstLogStep',
          type: 'console',
          with: {
            message: 'Anything',
          },
        } as ConnectorStep,
        {
          name: 'secondLogStep',
          type: 'console',
          with: {
            message: 'Anything',
          },
        } as ConnectorStep,
        {
          name: 'thirdLogStep',
          type: 'console',
          with: {
            message: 'Anything',
          },
        } as ConnectorStep,
        {
          name: 'fourthLogStep',
          type: 'console',
          with: {
            message: 'Anything',
          },
        } as ConnectorStep,
      ],
    };
    let testContainer: ReturnType<typeof createTestContainer>;

    beforeEach(() => {
      testContainer = createTestContainer(workflow);
      fakeNode.id = 'thirdLogStep';
      testContainer.workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        workflowDefinition: workflow,
        scopeStack: [] as StackFrame[],
      } as EsWorkflowExecution);

      testContainer.workflowExecutionState.getLatestStepExecution = jest
        .fn()
        .mockImplementation((stepId) => {
          switch (stepId) {
            case 'firstLogStep':
              return {
                state: { stateValue: 'first' },
                output: 'output1',
                error: null,
              };
            case 'secondLogStep':
              return {
                state: { stateValue: 'second' },
                output: null,
                error: new Error('Error in second step'),
              };
            case 'thirdLogStep':
              return { state: { stateValue: 'third' }, output: 'output3', error: null };
            case 'fourthLogStep':
              return { state: { stateValue: 'fourth' }, output: 'output4', error: null };
          }
        });
    });

    it('should return only steps from predecessors', () => {
      const context = testContainer.underTest.getContext();
      expect(Object.keys(context.steps).sort()).toEqual(['firstLogStep', 'secondLogStep'].sort());
    });

    it('should return all steps with state values', () => {
      const context = testContainer.underTest.getContext();
      expect(context.steps).toEqual({
        firstLogStep: expect.objectContaining({
          stateValue: 'first',
        }),
        secondLogStep: expect.objectContaining({
          stateValue: 'second',
        }),
      });
    });

    it('should return all step results', () => {
      const context = testContainer.underTest.getContext();
      expect(context.steps.firstLogStep).toEqual(
        expect.objectContaining({
          output: 'output1',
          error: null,
        })
      );
      expect(context.steps.secondLogStep).toEqual(
        expect.objectContaining({ output: null, error: new Error('Error in second step') })
      );
    });

    it('should enrich steps context with mocked data', () => {
      testContainer.workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        workflowDefinition: workflow,
        scopeStack: [] as StackFrame[],
        context: {
          contextOverride: {
            steps: {
              fourthLogStep: {
                state: 'fourth',
                output: 'output4',
                error: null,
              },
            },
          },
        } as Record<string, any>,
      } as EsWorkflowExecution);

      const context = testContainer.underTest.getContext();
      expect(Object.keys(context.steps).sort()).toEqual(
        ['firstLogStep', 'secondLogStep', 'fourthLogStep'].sort()
      );
      expect(context.steps.fourthLogStep).toEqual(
        expect.objectContaining({
          state: 'fourth',
          output: 'output4',
          error: null,
        })
      );
    });
  });

  describe('renderValueAccordingToContext', () => {
    const workflow: WorkflowYaml = {
      name: 'Test Workflow',
      version: '1',
      description: 'A test workflow',
      enabled: true,
      consts: {
        API_URL: 'https://api.example.com',
        TIMEOUT: 5000,
      },
      triggers: [],
      steps: [
        {
          name: 'fetchData',
          type: 'console',
          with: {
            message: 'Fetching data',
          },
        } as ConnectorStep,
        {
          name: 'processData',
          type: 'console',
          with: {
            message: 'Processing data',
          },
        } as ConnectorStep,
      ],
    };
    let testContainer: ReturnType<typeof createTestContainer>;

    beforeEach(() => {
      testContainer = createTestContainer(workflow);
      fakeNode.id = 'processData';
      testContainer.workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        workflowDefinition: workflow,
        id: 'exec-123',
        workflowId: 'workflow-456',
        spaceId: 'space-789',
        scopeStack: [] as StackFrame[],
        startedAt: new Date('2023-01-01T00:00:00Z').toISOString(),
        context: {
          inputs: {
            userId: 'user-123',
            count: 10,
          },
        } as Record<string, any>,
      } as EsWorkflowExecution);

      testContainer.workflowExecutionState.getLatestStepExecution = jest
        .fn()
        .mockImplementation((stepId) => {
          if (stepId === 'fetchData') {
            return {
              state: { status: 'completed' },
              output: { data: ['item1', 'item2'], total: 2 },
              error: null,
            };
          }
          return undefined;
        });
    });

    describe('string rendering', () => {
      it('should render a string with multiple template expressions', () => {
        testContainer.templatingEngineMock.render = jest
          .fn()
          .mockImplementation((template) => `rendered(${template})`);
        const result = testContainer.underTest.renderValueAccordingToContext(
          'Workflow {{workflow.name}} in space {{workflow.spaceId}}'
        );
        expect(result).toBe('rendered(Workflow {{workflow.name}} in space {{workflow.spaceId}})');
      });

      it('should provide rendering function with step context', () => {
        testContainer.underTest.renderValueAccordingToContext(
          'Workflow {{workflow.name}} in space {{workflow.spaceId}}'
        );
        const renderArgs = (testContainer.templatingEngineMock.render as jest.Mock).mock
          .calls[0][1];
        expect(renderArgs).toEqual(
          expect.objectContaining({
            execution: {
              id: 'exec-123',
              isTestRun: false,
              startedAt: new Date('2023-01-01T00:00:00.000Z'),
              url: 'http://localhost:5601/s/space-789/app/workflows/workflow-456?executionId=exec-123&tab=executions',
            },
            workflow: {
              id: 'workflow-456',
              name: 'Test Workflow',
              enabled: true,
              spaceId: 'space-789',
            },
            kibanaUrl: 'http://localhost:5601',
            consts: {
              API_URL: 'https://api.example.com',
              TIMEOUT: 5000,
            },
            event: undefined,
            inputs: {
              userId: 'user-123',
              count: 10,
            },
            steps: {
              fetchData: {
                input: undefined,
                output: {
                  data: ['item1', 'item2'],
                  total: 2,
                },
                error: null,
                status: 'completed',
              },
            },
          })
        );
      });

      it('should provide rendering function with object having templates', () => {
        testContainer.underTest.renderValueAccordingToContext({
          str: 'Some object',
        });
        expect(testContainer.templatingEngineMock.render).toHaveBeenCalledWith(
          {
            str: 'Some object',
          },
          expect.anything()
        );
      });
    });
  });
});
