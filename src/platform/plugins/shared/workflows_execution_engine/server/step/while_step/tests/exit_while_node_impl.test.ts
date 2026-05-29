/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExitWhileNode, WorkflowGraph } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { StepIoService } from '../../../workflow_context_manager/step_io_service';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger';
import { ExitWhileNodeImpl } from '../exit_while_node_impl';

describe('ExitWhileNodeImpl', () => {
  let node: ExitWhileNode;
  let wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager;
  let stepExecutionRuntime: StepExecutionRuntime;
  let workflowLogger: IWorkflowEventLogger;
  let stepIoService: StepIoService;
  let workflowGraph: WorkflowGraph;
  let underTest: ExitWhileNodeImpl;

  beforeEach(() => {
    node = {
      id: 'testStep',
      stepId: 'testStep',
      stepType: 'while',
      type: 'exit-while',
      startNodeId: 'whileStartNode',
      condition: 'steps.testStep.inner_step.output.status : "success"',
    };
    wfExecutionRuntimeManager = {} as unknown as WorkflowExecutionRuntimeManager;
    wfExecutionRuntimeManager.navigateToNextNode = jest.fn();
    wfExecutionRuntimeManager.navigateToNode = jest.fn();

    stepExecutionRuntime = {} as unknown as StepExecutionRuntime;
    stepExecutionRuntime.finishStep = jest.fn();
    stepExecutionRuntime.getCurrentStepState = jest.fn();
    stepExecutionRuntime.contextManager = {
      renderValueWithContext: jest.fn().mockImplementation((input) => input),
      getContext: jest.fn().mockReturnValue({}),
    } as any;

    workflowLogger = {} as unknown as IWorkflowEventLogger;
    workflowLogger.logDebug = jest.fn();

    stepIoService = {
      evictStaleLoopOutputs: jest.fn(),
    } as unknown as StepIoService;

    workflowGraph = {
      getInnerStepIds: jest.fn().mockReturnValue(new Set(['inner_step'])),
    } as unknown as WorkflowGraph;

    underTest = new ExitWhileNodeImpl(
      node,
      stepExecutionRuntime,
      wfExecutionRuntimeManager,
      workflowLogger,
      stepIoService,
      workflowGraph
    );
  });

  describe('when no while state exists', () => {
    beforeEach(() => {
      (stepExecutionRuntime.getCurrentStepState as jest.Mock).mockReturnValue(undefined);
    });

    it('should throw an error', () => {
      expect(() => underTest.run()).toThrow(
        new Error(`While state for step ${node.stepId} not found`)
      );
    });
  });

  describe('when condition evaluates to true and under max-iterations', () => {
    beforeEach(() => {
      (stepExecutionRuntime.getCurrentStepState as jest.Mock).mockReturnValue({
        iteration: 1,
      });
      (stepExecutionRuntime.contextManager.renderValueWithContext as jest.Mock).mockReturnValue(
        true
      );
    });

    it('should loop back to the start node', () => {
      underTest.run();

      expect(wfExecutionRuntimeManager.navigateToNode).toHaveBeenCalledWith(node.startNodeId);
      expect(stepExecutionRuntime.contextManager.getContext).toHaveBeenCalledTimes(1);
    });

    it('should not finish the step', () => {
      underTest.run();

      expect(stepExecutionRuntime.finishStep).not.toHaveBeenCalled();
    });
  });

  describe('when condition evaluates to false', () => {
    beforeEach(() => {
      (stepExecutionRuntime.getCurrentStepState as jest.Mock).mockReturnValue({
        iteration: 2,
      });
      (stepExecutionRuntime.contextManager.renderValueWithContext as jest.Mock).mockReturnValue(
        false
      );
    });

    it('should finish the step', () => {
      underTest.run();

      expect(stepExecutionRuntime.finishStep).toHaveBeenCalled();
    });

    it('should navigate to the next node', () => {
      underTest.run();

      expect(wfExecutionRuntimeManager.navigateToNextNode).toHaveBeenCalled();
    });

    it('should log debug message with condition reason', () => {
      underTest.run();

      expect(workflowLogger.logDebug).toHaveBeenCalledWith(
        `Exiting while step "${node.stepId}" after condition. Completed 3 iterations.`,
        { workflow: { step_id: node.stepId } }
      );
    });
  });

  describe('when max-iterations is reached', () => {
    beforeEach(() => {
      (stepExecutionRuntime.getCurrentStepState as jest.Mock).mockReturnValue({
        iteration: 1,
      });
      node.maxIterations = 2;
    });

    describe('with on-limit = continue (default)', () => {
      it('should finish the step', () => {
        underTest.run();

        expect(stepExecutionRuntime.finishStep).toHaveBeenCalled();
      });

      it('should navigate to the next node', () => {
        underTest.run();

        expect(wfExecutionRuntimeManager.navigateToNextNode).toHaveBeenCalled();
      });

      it('should log debug message with max-iterations reason', () => {
        underTest.run();

        expect(workflowLogger.logDebug).toHaveBeenCalledWith(
          `Exiting while step "${node.stepId}" after max-iterations. Completed 2 iterations.`,
          { workflow: { step_id: node.stepId } }
        );
      });

      it('should not evaluate the condition', () => {
        underTest.run();

        expect(stepExecutionRuntime.contextManager.renderValueWithContext).not.toHaveBeenCalled();
      });
    });

    describe('with on-limit = fail', () => {
      beforeEach(() => {
        node.onLimit = 'fail';
      });

      it('should throw an error', () => {
        expect(() => underTest.run()).toThrow(
          `While step "${node.stepId}" exceeded max-iterations limit of 2. Completed 2 iterations.`
        );
      });

      it('should not finish the step when throwing', () => {
        try {
          underTest.run();
        } catch {
          // expected
        }

        expect(stepExecutionRuntime.finishStep).not.toHaveBeenCalled();
      });
    });
  });

  describe('condition evaluation edge cases', () => {
    beforeEach(() => {
      (stepExecutionRuntime.getCurrentStepState as jest.Mock).mockReturnValue({
        iteration: 0,
      });
    });

    it('should handle boolean true condition', () => {
      (stepExecutionRuntime.contextManager.renderValueWithContext as jest.Mock).mockReturnValue(
        true
      );

      underTest.run();

      expect(wfExecutionRuntimeManager.navigateToNode).toHaveBeenCalledWith(node.startNodeId);
    });

    it('should handle boolean false condition', () => {
      (stepExecutionRuntime.contextManager.renderValueWithContext as jest.Mock).mockReturnValue(
        false
      );

      underTest.run();

      expect(stepExecutionRuntime.finishStep).toHaveBeenCalled();
      expect(wfExecutionRuntimeManager.navigateToNextNode).toHaveBeenCalled();
    });

    it('should handle undefined condition as false', () => {
      (stepExecutionRuntime.contextManager.renderValueWithContext as jest.Mock).mockReturnValue(
        undefined
      );

      underTest.run();

      expect(stepExecutionRuntime.finishStep).toHaveBeenCalled();
      expect(wfExecutionRuntimeManager.navigateToNextNode).toHaveBeenCalled();
    });
  });

  describe('stale loop output eviction', () => {
    it('should evict stale loop outputs when condition is false', () => {
      (stepExecutionRuntime.getCurrentStepState as jest.Mock).mockReturnValue({
        iteration: 2,
      });
      (stepExecutionRuntime.contextManager.renderValueWithContext as jest.Mock).mockReturnValue(
        false
      );

      underTest.run();

      expect(workflowGraph.getInnerStepIds).toHaveBeenCalledWith('testStep');
      expect(stepIoService.evictStaleLoopOutputs).toHaveBeenCalledWith(new Set(['inner_step']));
    });

    it('should evict stale loop outputs when max-iterations reached with continue', () => {
      (stepExecutionRuntime.getCurrentStepState as jest.Mock).mockReturnValue({
        iteration: 1,
      });
      node.maxIterations = 2;

      underTest.run();

      expect(stepIoService.evictStaleLoopOutputs).toHaveBeenCalled();
    });

    it('should evict stale loop outputs before throwing on max-iterations with on-limit fail', () => {
      (stepExecutionRuntime.getCurrentStepState as jest.Mock).mockReturnValue({
        iteration: 1,
      });
      node.maxIterations = 2;
      node.onLimit = 'fail';

      expect(() => underTest.run()).toThrow();
      expect(stepIoService.evictStaleLoopOutputs).toHaveBeenCalledWith(new Set(['inner_step']));
    });

    it('should not evict stale loop outputs when looping back', () => {
      (stepExecutionRuntime.getCurrentStepState as jest.Mock).mockReturnValue({
        iteration: 0,
      });
      (stepExecutionRuntime.contextManager.renderValueWithContext as jest.Mock).mockReturnValue(
        true
      );

      underTest.run();

      expect(stepIoService.evictStaleLoopOutputs).not.toHaveBeenCalled();
    });
  });
});
