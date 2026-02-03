/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowExecutionRuntimeManager } from '../../../../workflow_context_manager/workflow_execution_runtime_manager';
import { EnterNormalPathNodeImpl } from '../enter_normal_path_node_impl';

describe('EnterNormalPathNodeImpl', () => {
  let underTest: EnterNormalPathNodeImpl;
  let mockWorkflowRuntime: jest.Mocked<WorkflowExecutionRuntimeManager>;

  beforeEach(() => {
    mockWorkflowRuntime = {
      navigateToNextNode: jest.fn(),
    } as any;

    underTest = new EnterNormalPathNodeImpl(mockWorkflowRuntime);
  });

  describe('run', () => {
    it('should go to next step', async () => {
      await underTest.run();
      expect(mockWorkflowRuntime.navigateToNextNode).toHaveBeenCalled();
    });
  });
});
