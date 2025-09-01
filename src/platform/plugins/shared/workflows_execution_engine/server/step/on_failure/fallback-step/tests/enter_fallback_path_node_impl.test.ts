/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowExecutionRuntimeManager } from '../../../../workflow_context_manager/workflow_execution_runtime_manager';
import { EnterFallbackPathNodeImpl } from '../enter_fallback_path_node_impl';

describe('EnterFallbackPathNodeImpl', () => {
  let underTest: EnterFallbackPathNodeImpl;
  let workflowRuntime: WorkflowExecutionRuntimeManager;

  beforeEach(() => {
    workflowRuntime = {} as unknown as WorkflowExecutionRuntimeManager;
    workflowRuntime.enterScope = jest.fn();
    workflowRuntime.goToNextStep = jest.fn();

    underTest = new EnterFallbackPathNodeImpl(workflowRuntime);
  });

  describe('run', () => {
    it('should enter scope', async () => {
      await underTest.run();
      expect(workflowRuntime.enterScope).toHaveBeenCalled();
    });

    it('should go to next step', async () => {
      await underTest.run();
      expect(workflowRuntime.goToNextStep).toHaveBeenCalled();
    });

    it('should execute steps in correct order', async () => {
      const calls: string[] = [];
      workflowRuntime.enterScope = jest.fn().mockImplementation(() => {
        calls.push('enterScope');
      });
      workflowRuntime.goToNextStep = jest.fn().mockImplementation(() => {
        calls.push('goToNextStep');
      });

      await underTest.run();

      expect(calls).toEqual(['enterScope', 'goToNextStep']);
    });
  });
});
