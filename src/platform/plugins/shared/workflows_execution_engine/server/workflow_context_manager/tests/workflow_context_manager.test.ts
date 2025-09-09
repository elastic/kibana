/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowContextManager } from '../workflow_context_manager';
import type { WorkflowExecutionRuntimeManager } from '../workflow_execution_runtime_manager';
import type { ConnectorStep, EsWorkflowExecution, ForEachStep, WorkflowYaml } from '@kbn/workflows';
import { convertToWorkflowGraph } from '@kbn/workflows/graph';

describe('WorkflowContextManager', () => {
  function createTestContainer(workflow: WorkflowYaml) {
    const workflowExecutionGraph = convertToWorkflowGraph(workflow);
    const workflowExecutionRuntime = {} as WorkflowExecutionRuntimeManager;
    workflowExecutionRuntime.getCurrentStep = jest.fn().mockReturnValue({
      id: 'testStep',
    });
    workflowExecutionRuntime.getWorkflowExecution = jest.fn().mockReturnValue({
      stack: [] as string[],
      workflowDefinition: workflow,
    } as EsWorkflowExecution);

    const underTest = new WorkflowContextManager({
      workflowExecutionGraph,
      workflowExecutionRuntime,
    });

    return {
      workflowExecutionGraph,
      workflowExecutionRuntime,
      underTest,
    };
  }

  it('should have consts from workflow', () => {
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
    const { underTest } = createTestContainer(workflow);

    const stepContext = underTest.getContext();
    expect(stepContext.consts).toEqual({
      CONST_1: 'value1',
      CONST_2: 42,
    });
  });

  it('should have event from execution context', () => {
    const workflow: WorkflowYaml = {
      name: 'Test Workflow',
      version: '1',
      description: 'A test workflow',
      enabled: true,
      consts: {},
      triggers: [],
      steps: [],
    };

    const { underTest, workflowExecutionRuntime } = createTestContainer(workflow);
    workflowExecutionRuntime.getWorkflowExecution = jest.fn().mockReturnValue({
      stack: [] as string[],
      workflowDefinition: workflow,
      context: {
        event: {
          name: 'alert',
          severity: 'high',
        },
      } as Record<string, any>,
    } as EsWorkflowExecution);
    const stepContext = underTest.getContext();
    expect(stepContext.event).toEqual({
      name: 'alert',
      severity: 'high',
    });
  });

  it('should have inputs from execution context', () => {
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

    const { underTest, workflowExecutionRuntime } = createTestContainer(workflow);
    workflowExecutionRuntime.getWorkflowExecution = jest.fn().mockReturnValue({
      stack: [] as string[],
      workflowDefinition: workflow,
      context: {
        inputs: {
          name: 'test',
        },
      } as Record<string, any>,
    } as EsWorkflowExecution);
    const stepContext = underTest.getContext();
    expect(stepContext.inputs).toEqual({
      name: 'test',
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
      testContainer.workflowExecutionRuntime.getCurrentStep = jest.fn().mockReturnValue({
        id: 'testStep',
      });
      testContainer.workflowExecutionRuntime.getWorkflowExecution = jest.fn().mockReturnValue({
        workflowDefinition: workflow,
        workflowId: 'fake-workflow-id',
        spaceId: 'fake-space-id',
        stack: [] as string[],
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
      testContainer.workflowExecutionRuntime.getCurrentStep = jest.fn().mockReturnValue({
        id: 'testStep',
      });
      testContainer.workflowExecutionRuntime.getWorkflowExecution = jest.fn().mockReturnValue({
        workflowDefinition: workflow,
        id: 'fake-execution-id',
        stack: [] as string[],
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
        testContainer.workflowExecutionRuntime.getWorkflowExecution = jest.fn().mockReturnValue({
          workflowDefinition: workflow,
          stack: [] as string[],
          isTestRun: true,
        } as EsWorkflowExecution);
        const context = testContainer.underTest.getContext();
        expect(context.execution.isTestRun).toBe(true);
      });

      it.each([undefined, null, false])(
        'should return false in isTestRun flag if isTestRun in workflow execution is %s',
        (isTestRun) => {
          testContainer.workflowExecutionRuntime.getWorkflowExecution = jest.fn().mockReturnValue({
            workflowDefinition: workflow,
            stack: [] as string[],
            isTestRun,
          } as EsWorkflowExecution);
          const context = testContainer.underTest.getContext();
          expect(context.execution.isTestRun).toBe(false);
        }
      );
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

      testContainer.workflowExecutionRuntime.getStepResult = jest.fn().mockReturnValue({
        output: 'test output',
        error: null,
      });
    });

    it('should have foreach equal to the inner foreach step state for step innerLogStep', () => {
      testContainer.workflowExecutionRuntime.getWorkflowExecution = jest.fn().mockReturnValue({
        workflowDefinition: workflow,
        stack: ['outerForeachStep', 'innerForeachStep'],
      } as EsWorkflowExecution);
      testContainer.workflowExecutionRuntime.getCurrentStep = jest
        .fn()
        .mockReturnValue({ id: 'innerLogStep' });
      testContainer.workflowExecutionRuntime.getStepState = jest
        .fn()
        .mockImplementation((nodeId) => {
          if (nodeId === 'outerForeachStep') {
            return {
              items: ['item1', 'item2', 'item3'],
              index: 0,
              item: 'item1',
              total: 3,
            };
          }
          if (nodeId === 'innerForeachStep') {
            return {
              items: ['1', '2', '3', '4'],
              index: 1,
              item: '2',
              total: 4,
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
      testContainer.workflowExecutionRuntime.getWorkflowExecution = jest.fn().mockReturnValue({
        workflowDefinition: workflow,
        stack: [] as string[],
      } as EsWorkflowExecution);
      testContainer.workflowExecutionRuntime.getCurrentStep = jest
        .fn()
        .mockReturnValue({ id: 'lastLogStep' });
      testContainer.workflowExecutionRuntime.getStepState = jest.fn();

      const context = testContainer.underTest.getContext();
      expect(context.foreach).toBeUndefined();
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

      testContainer.workflowExecutionRuntime.getStepResult = jest.fn().mockReturnValue({
        output: 'test output',
        error: null,
      });
      testContainer.workflowExecutionRuntime.getWorkflowExecution = jest.fn().mockReturnValue({
        workflowDefinition: workflow,
        stack: [] as string[],
      } as EsWorkflowExecution);
      testContainer.workflowExecutionRuntime.getCurrentStep = jest
        .fn()
        .mockReturnValue({ id: 'thirdLogStep' });
      testContainer.workflowExecutionRuntime.getStepState = jest
        .fn()
        .mockImplementation((nodeId) => {
          switch (nodeId) {
            case 'firstLogStep':
              return { stateValue: 'first' };
            case 'secondLogStep':
              return { stateValue: 'second' };
            case 'thirdLogStep':
              return { stateValue: 'third' };
            case 'fourthLogStep':
              return { stateValue: 'fourth' };
          }
          return undefined;
        });
      testContainer.workflowExecutionRuntime.getStepResult = jest
        .fn()
        .mockImplementation((nodeId) => {
          switch (nodeId) {
            case 'firstLogStep':
              return { output: 'output1', error: null };
            case 'secondLogStep':
              return { output: null, error: new Error('Error in second step') };
            case 'thirdLogStep':
              return { output: 'output3', error: null };
            case 'fourthLogStep':
              return { output: 'output4', error: null };
          }
          return undefined;
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
  });
});
