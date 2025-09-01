/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EnterOnFailureNodeImpl } from '../enter_on_failure_node_impl';
import type { WorkflowExecutionRuntimeManager } from '../../../../workflow_context_manager/workflow_execution_runtime_manager';

describe('EnterOnFailureNodeImpl', () => {
  let underTest: EnterOnFailureNodeImpl;
  let workflowRuntime: WorkflowExecutionRuntimeManager;

  beforeEach(() => {
    workflowRuntime = {} as unknown as WorkflowExecutionRuntimeManager;
    underTest = new EnterOnFailureNodeImpl(workflowRuntime);
  });

  describe('run', () => {
    beforeEach(() => {
      workflowRuntime.enterScope = jest.fn();
      workflowRuntime.goToNextStep = jest.fn();
    });

    it('should enter scope', async () => {
      await underTest.run();
      expect(workflowRuntime.enterScope).toHaveBeenCalled();
    });

    it('should go to next step', async () => {
      await underTest.run();
      expect(workflowRuntime.goToNextStep).toHaveBeenCalled();
    });

    it('should exit scope before going to next step', async () => {
      const exitScopeSpy = jest.spyOn(workflowRuntime, 'enterScope');
      const goToNextStepSpy = jest.spyOn(workflowRuntime, 'goToNextStep');

      await underTest.run();

      expect(exitScopeSpy.mock.invocationCallOrder[0]).toBeLessThan(
        goToNextStepSpy.mock.invocationCallOrder[0]
      );
    });
  });
});
