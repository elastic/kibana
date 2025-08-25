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
    const event = { type: 'test_event' };
    const workflowExecutionGraph = convertToWorkflowGraph(workflow);
    const workflowExecutionRuntime = {} as WorkflowExecutionRuntimeManager;

    const underTest = new WorkflowContextManager({
      spaceId: 'default',
      workflow,
      event,
      workflowExecutionGraph,
      workflowExecutionRuntime,
    });

    return {
      event,
      workflowExecutionGraph,
      workflowExecutionRuntime,
      underTest,
    };
  }

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
