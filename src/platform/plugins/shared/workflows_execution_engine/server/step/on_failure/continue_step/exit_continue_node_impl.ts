/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { NodeImplementation } from '../../node_implementation';

export class ExitContinueNodeImpl implements NodeImplementation {
  constructor(private workflowRuntime: WorkflowExecutionRuntimeManager) {}

  public run(): void {
    this.workflowRuntime.navigateToNextNode();
  }
}
