/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterTryBlockNode } from '@kbn/workflows';
import type { WorkflowExecutionRuntimeManager } from '../../../../workflow_context_manager/workflow_execution_runtime_manager';
import { EnterTryBlockNodeImpl } from '../enter_try_block_node_impl';

describe('EnterTryBlockNodeImpl', () => {
  let underTest: EnterTryBlockNodeImpl;
  let step: EnterTryBlockNode;
  let workflowRuntime: WorkflowExecutionRuntimeManager;

  beforeEach(() => {
    step = {
      id: 'onFailureZone1',
      type: 'enter-try-block',
      enterNormalPathNodeId: 'enterNormalPath1',
      exitNodeId: 'exitOnFailureZone1',
    };
    workflowRuntime = {} as unknown as WorkflowExecutionRuntimeManager;
    workflowRuntime.startStep = jest.fn();
    workflowRuntime.enterScope = jest.fn();
    workflowRuntime.goToStep = jest.fn();

    underTest = new EnterTryBlockNodeImpl(step, workflowRuntime);
  });

  describe('run', () => {
    it('should start the step with correct node id', async () => {
      await underTest.run();
      expect(workflowRuntime.startStep).toHaveBeenCalledWith(step.id);
    });

    it('should enter scope', async () => {
      await underTest.run();
      expect(workflowRuntime.enterScope).toHaveBeenCalled();
    });

    it('should go to normal path entry node', async () => {
      await underTest.run();
      expect(workflowRuntime.goToStep).toHaveBeenCalledWith(step.enterNormalPathNodeId);
    });

    it('should execute steps in correct order', async () => {
      const calls: string[] = [];
      workflowRuntime.startStep = jest.fn().mockImplementation(() => {
        calls.push('startStep');
        return Promise.resolve();
      });
      workflowRuntime.enterScope = jest.fn().mockImplementation(() => {
        calls.push('enterScope');
      });
      workflowRuntime.goToStep = jest.fn().mockImplementation(() => {
        calls.push('goToStep');
      });

      await underTest.run();

      expect(calls).toEqual(['startStep', 'enterScope', 'goToStep']);
    });
  });
});
