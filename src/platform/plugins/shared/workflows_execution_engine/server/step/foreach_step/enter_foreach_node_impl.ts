/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPropertyAccess } from '@kbn/workflows/common/utils';
import type { EnterForeachNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';
import type { NodeImplementation } from '../node_implementation';

export class EnterForeachNodeImpl implements NodeImplementation {
  constructor(
    private node: EnterForeachNode,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager,
    private stepExecutionRuntime: StepExecutionRuntime,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  public async run(): Promise<void> {
    if (!this.stepExecutionRuntime.getCurrentStepState()) {
      await this.enterForeach();
    } else {
      await this.advanceIteration();
    }
  }

  private async enterForeach(): Promise<void> {
    await this.stepExecutionRuntime.startStep();
    let foreachState = this.stepExecutionRuntime.getCurrentStepState();
    const renderedForeachExpression = this.getForeachExpression();
    await this.stepExecutionRuntime.setInput({
      foreach: renderedForeachExpression,
    });
    const evaluatedItems = this.getItems(renderedForeachExpression);

    if (evaluatedItems.length === 0) {
      this.workflowLogger.logDebug(
        `Foreach step "${this.node.stepId}" has no items to iterate over. Skipping execution.`,
        {
          workflow: { step_id: this.node.stepId },
        }
      );
      await this.stepExecutionRuntime.setCurrentStepState({
        items: [],
        total: 0,
      });
      await this.stepExecutionRuntime.finishStep();
      this.wfExecutionRuntimeManager.navigateToNode(this.node.exitNodeId);
      return;
    }

    this.workflowLogger.logDebug(
      `Foreach step "${this.node.stepId}" will iterate over ${evaluatedItems.length} items.`,
      {
        workflow: { step_id: this.node.stepId },
      }
    );

    // Initialize foreach state
    foreachState = {
      items: evaluatedItems,
      item: evaluatedItems[0],
      index: 0,
      total: evaluatedItems.length,
    };

    await this.stepExecutionRuntime.setCurrentStepState(foreachState);
    // Enter a new scope for the first iteration
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.wfExecutionRuntimeManager.enterScope(foreachState.index!.toString());
    this.wfExecutionRuntimeManager.navigateToNextNode();
  }

  private async advanceIteration(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    let foreachState = this.stepExecutionRuntime.getCurrentStepState()!;
    // Update items and index if they have changed
    const items = foreachState.items;
    const index = foreachState.index + 1;
    const item = items[index];
    const total = foreachState.total;
    foreachState = {
      items,
      index,
      item,
      total,
    };
    // Enter a new scope for the new iteration
    await this.stepExecutionRuntime.setCurrentStepState(foreachState);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.wfExecutionRuntimeManager.enterScope(foreachState.index!.toString());
    this.wfExecutionRuntimeManager.navigateToNextNode();
  }

  private getForeachExpression(): string {
    if (!this.node.configuration.foreach) {
      throw new Error(
        `Foreach configuration is required. Please specify an array or expression that evaluates to an array.`
      );
    }

    const renderedForeachExpression =
      this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(
        this.node.configuration.foreach
      );

    return renderedForeachExpression;
  }

  private getItems(renderedForeachExpression: string): unknown[] {
    let resolvedValue;

    if (isPropertyAccess(renderedForeachExpression)) {
      const result =
        this.stepExecutionRuntime.contextManager.readContextPath(renderedForeachExpression);

      if (!result.pathExists) {
        throw new Error(
          `Expression "${renderedForeachExpression}" could not be found in the context. ` +
            `Please ensure the expression references an array variable or update the configuration.`
        );
      }

      resolvedValue = result.value;
    } else {
      resolvedValue = renderedForeachExpression; // renderedForeachExpression could be a JSON array string
    }

    if (typeof resolvedValue === 'string') {
      resolvedValue = this.tryParseJSON(resolvedValue);
    }

    if (resolvedValue) {
      if (Array.isArray(resolvedValue)) {
        return resolvedValue;
      }

      throw new Error(
        `Foreach expression must evaluate to an array. ` +
          `Expression "${renderedForeachExpression}" resolved to ${typeof resolvedValue}${
            resolvedValue === null
              ? ' (null)'
              : resolvedValue === undefined
              ? ' (undefined)'
              : `: ${JSON.stringify(resolvedValue).substring(0, 100)}${
                  JSON.stringify(resolvedValue).length > 100 ? '...' : ''
                }`
          }. `
      );
    }

    throw new Error(
      `Foreach expression must be a valid JSON array or a context path. ` +
        `Got: ${renderedForeachExpression}`
    );
  }

  private tryParseJSON(value: string): unknown | undefined {
    let parsed;
    try {
      parsed = JSON.parse(value);
    } catch (error) {
      return undefined;
    }

    return parsed;
  }
}
