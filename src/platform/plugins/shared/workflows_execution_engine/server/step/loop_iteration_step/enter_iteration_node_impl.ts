/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { StepExecutionRuntimeFactory } from '../../workflow_context_manager/step_execution_runtime_factory';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import { WorkflowScopeStack } from '../../workflow_context_manager/workflow_scope_stack';
import type { NodeImplementation } from '../node_implementation';

/**
 * Runtime-only foreach iteration enter. Not a compiled graph node.
 * Starts the persisted iteration record and continues into the foreach body.
 */
export class EnterIterationNodeImpl implements NodeImplementation {
  constructor(
    private stepExecutionRuntime: StepExecutionRuntime,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager,
    private stepExecutionRuntimeFactory: StepExecutionRuntimeFactory
  ) {}

  public run(): void {
    // `run_node` already dropped the iteration frame via removeCurrentNodeFromStackFrames.
    // The current top is the enclosing foreach — do not exitScope again or we land on
    // its parent (often the workflow timeout zone), which has no `items` input.
    const foreachScopeStack = WorkflowScopeStack.fromStackFrames(
      this.stepExecutionRuntime.scopeStack.stackFrames
    );

    if (foreachScopeStack.isEmpty()) {
      throw new Error('Enter-iteration requires an enclosing foreach on the scope stack');
    }

    const foreachScope = foreachScopeStack.getCurrentScope();

    if (foreachScope.nodeType !== 'enter-foreach') {
      throw new Error(
        `Enter-iteration requires an enclosing foreach on the scope stack, got "${foreachScope.nodeType}"`
      );
    }
    const index = Number(this.stepExecutionRuntime.node.stepId);

    if (!Number.isInteger(index) || index < 0) {
      throw new Error(
        `Enter-iteration step id must be a non-negative index, got "${this.stepExecutionRuntime.node.stepId}"`
      );
    }

    const foreachRuntime = this.stepExecutionRuntimeFactory.createStepExecutionRuntime({
      nodeId: foreachScope.nodeId,
      stackFrames: foreachScopeStack.stackFrames,
    });
    const items = foreachRuntime.getInputs()?.items;

    if (!Array.isArray(items)) {
      throw new Error(`Foreach step "${foreachScope.stepId}" has no items array`);
    }

    if (index >= items.length) {
      throw new Error(`Foreach step "${foreachScope.stepId}" has no item at index ${index}`);
    }

    this.stepExecutionRuntime.startStep();
    this.stepExecutionRuntime.setInput({ item: items[index] });
    this.wfExecutionRuntimeManager.navigateToNextNode();
  }
}
