/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExitFallbackPathNode } from '@kbn/workflows';
import type { WorkflowExecutionRuntimeManager } from '../../../../workflow_context_manager/workflow_execution_runtime_manager';
import { ExitFallbackPathNodeImpl } from '../exit_fallback_path_node_impl';

describe('ExitFallbackPathNodeImpl', () => {
  let underTest: ExitFallbackPathNodeImpl;
  let step: ExitFallbackPathNode;
  let workflowRuntime: WorkflowExecutionRuntimeManager;

  beforeEach(() => {
    step = {
      id: 'exitFailurePath1',
      type: 'exit-fallback-path',
      exitOnFailureZoneNodeId: 'exitOnFailureZone1',
      enterNodeId: 'enterFailurePath1',
    };
    workflowRuntime = {} as unknown as WorkflowExecutionRuntimeManager;
    workflowRuntime.exitScope = jest.fn();
    workflowRuntime.goToStep = jest.fn();

    underTest = new ExitFallbackPathNodeImpl(step, workflowRuntime);
  });

  describe('run', () => {
    it('should exit scope', async () => {
      await underTest.run();
      expect(workflowRuntime.exitScope).toHaveBeenCalled();
    });

    it('should go to exit on failure zone node', async () => {
      await underTest.run();
      expect(workflowRuntime.goToStep).toHaveBeenCalledWith(step.exitOnFailureZoneNodeId);
    });

    it('should execute steps in correct order', async () => {
      const calls: string[] = [];
      workflowRuntime.exitScope = jest.fn().mockImplementation(() => {
        calls.push('exitScope');
      });
      workflowRuntime.goToStep = jest.fn().mockImplementation(() => {
        calls.push('goToStep');
      });

      await underTest.run();

      expect(calls).toEqual(['exitScope', 'goToStep']);
    });
  });
});
