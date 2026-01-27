/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowExecutionRuntimeManager } from '../../../../workflow_context_manager/workflow_execution_runtime_manager';
import { ExitContinueNodeImpl } from '../exit_continue_node_impl';

describe('ExitContinueNodeImpl', () => {
  let underTest: ExitContinueNodeImpl;
  let workflowRuntime: WorkflowExecutionRuntimeManager;

  beforeEach(() => {
    workflowRuntime = {} as unknown as WorkflowExecutionRuntimeManager;
    underTest = new ExitContinueNodeImpl(workflowRuntime);
  });

  describe('run', () => {
    beforeEach(() => {
      workflowRuntime.navigateToNextNode = jest.fn();
    });

    it('should go to next node', async () => {
      await underTest.run();
      expect(workflowRuntime.navigateToNextNode).toHaveBeenCalled();
    });
  });
});
