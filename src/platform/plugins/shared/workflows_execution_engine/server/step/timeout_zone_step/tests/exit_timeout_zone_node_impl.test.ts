/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExitTimeoutZoneNode } from '@kbn/workflows/graph';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger/workflow_event_logger';
import { ExitTimeoutZoneNodeImpl } from '../exit_timeout_zone_node_impl';

describe('ExitTimeoutZoneNodeImpl', () => {
  let node: ExitTimeoutZoneNode;
  let wfExecutionRuntimeManager: jest.Mocked<WorkflowExecutionRuntimeManager>;
  let workflowLogger: jest.Mocked<IWorkflowEventLogger>;
  let exitTimeoutZoneNodeImpl: ExitTimeoutZoneNodeImpl;

  beforeEach(() => {
    node = {
      id: 'exit-timeout-zone-1',
      type: 'exit-timeout-zone',
      stepId: 'timeout-zone-step',
      stepType: 'timeout-zone',
    } as ExitTimeoutZoneNode;

    wfExecutionRuntimeManager = {
      startStep: jest.fn(),
      finishStep: jest.fn(),
      navigateToNextNode: jest.fn(),
    } as any;

    workflowLogger = {
      logInfo: jest.fn(),
    } as any;

    exitTimeoutZoneNodeImpl = new ExitTimeoutZoneNodeImpl(
      node,
      wfExecutionRuntimeManager,
      workflowLogger
    );
  });

  describe('run', () => {

    // TODO: Add more comprehensive tests when timeout logic is implemented
    // - Test timeout timer cleanup
    // - Test timeout state removal
    // - Test nested timeout zones handling
    // - Test error handling for cleanup failures
  });
});
