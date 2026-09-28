/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GraphNodeUnion } from '@kbn/workflows/graph';
import {
  extractForeachExpressionFromInput,
  extractForeachItemsFromInput,
  indexFromIterationStepId,
} from './utils';
import { isTemplateExpression } from '../../utils';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { StepExecutionRuntimeFactory } from '../../workflow_context_manager/step_execution_runtime_factory';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { NodeImplementation } from '../node_implementation';

export class EnterForeachIterationNodeImpl implements NodeImplementation {
  constructor(
    private node: GraphNodeUnion,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager,
    private stepExecutionRuntime: StepExecutionRuntime,
    private stepExecutionRuntimeFactory: StepExecutionRuntimeFactory
  ) {}

  public run(): void {
    this.stepExecutionRuntime.startStep();

    const foreachStepRuntime = this.getEnclosingForeachStepRuntime();
    const input = foreachStepRuntime.getCurrentStepResult()?.input;
    const items =
      extractForeachItemsFromInput(input) ?? this.evaluateForeachItems(foreachStepRuntime, input);
    const index = indexFromIterationStepId(this.node.stepId);

    if (!items) {
      throw new Error(
        `Foreach step "${foreachStepRuntime.node.stepId}" has no items in its input.`
      );
    }

    if (index >= items.length) {
      throw new Error(
        `Foreach iteration index ${index} is out of range for ${items.length} items.`
      );
    }

    this.stepExecutionRuntime.setInput({ item: items[index] });
    this.wfExecutionRuntimeManager.navigateToNextNode();
  }

  /** Older executions stored only `input.foreach`; re-evaluate that expression. */
  private evaluateForeachItems(
    foreachStepRuntime: StepExecutionRuntime,
    input: unknown
  ): unknown[] | undefined {
    const expression = extractForeachExpressionFromInput(input);
    if (expression == null) {
      return undefined;
    }

    const { contextManager } = foreachStepRuntime;
    let resolvedValue: unknown = isTemplateExpression(expression)
      ? contextManager.evaluateExpressionInContext(expression)
      : contextManager.renderValueAccordingToContext(expression);

    if (typeof resolvedValue === 'string') {
      try {
        resolvedValue = JSON.parse(resolvedValue);
      } catch {
        throw new Error(`Unable to parse rendered value: ${resolvedValue}`);
      }
    }

    return Array.isArray(resolvedValue) ? resolvedValue : undefined;
  }

  private getEnclosingForeachStepRuntime(): StepExecutionRuntime {
    const scopeStack = this.stepExecutionRuntime.scopeStack;
    const foreachScope = scopeStack.getCurrentScope();

    return this.stepExecutionRuntimeFactory.createStepExecutionRuntime({
      nodeId: foreachScope.nodeId,
      stackFrames: scopeStack.exitScope().stackFrames,
    });
  }
}
