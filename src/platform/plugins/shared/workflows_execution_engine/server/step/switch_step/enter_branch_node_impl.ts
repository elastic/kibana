/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterCaseBranchNode, EnterDefaultBranchNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { NodeImplementation } from '../node_implementation';

export class EnterBranchNodeImpl implements NodeImplementation {
  constructor(
    private node: EnterCaseBranchNode | EnterDefaultBranchNode,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager,
    private stepExecutionRuntime: StepExecutionRuntime
  ) {}

  public run(): void {
    if (this.node.type === 'enter-case-branch') {
      const renderedMatch =
        typeof this.node.match === 'string'
          ? this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(this.node.match)
          : this.node.match;
      this.wfExecutionRuntimeManager.enterScope(`case_${String(renderedMatch)}`);
    } else {
      this.wfExecutionRuntimeManager.enterScope('default');
    }
    this.wfExecutionRuntimeManager.navigateToNextNode();
  }
}
