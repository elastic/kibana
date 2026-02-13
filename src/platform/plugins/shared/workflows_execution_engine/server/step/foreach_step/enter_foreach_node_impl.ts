/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterForeachNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
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
      this.advanceIteration();
    }
  }

  private async enterForeach(): Promise<void> {
    this.stepExecutionRuntime.startStep();
    let foreachState = this.stepExecutionRuntime.getCurrentStepState();
    this.stepExecutionRuntime.setInput({
      foreach: this.node.configuration.foreach,
    });
    const evaluatedItems = this.getItems();

    if (evaluatedItems.length === 0) {
      this.workflowLogger.logDebug(
        `Foreach step "${this.node.stepId}" has no items to iterate over. Skipping execution.`,
        {
          workflow: { step_id: this.node.stepId },
        }
      );
      this.stepExecutionRuntime.setCurrentStepState({
        items: [],
        total: 0,
      });
      this.stepExecutionRuntime.finishStep();
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

    this.stepExecutionRuntime.setCurrentStepState(foreachState);
    // Enter a new scope for the first iteration
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.wfExecutionRuntimeManager.enterScope(foreachState.index!.toString());
    this.wfExecutionRuntimeManager.navigateToNextNode();
  }

  private advanceIteration(): void {
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
    this.stepExecutionRuntime.setCurrentStepState(foreachState);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.wfExecutionRuntimeManager.enterScope(foreachState.index!.toString());
    this.wfExecutionRuntimeManager.navigateToNextNode();
  }

  private getItems(): unknown[] {
    const expression = this.node.configuration.foreach;
    let resolvedValue = this.processForeachConfiguration();

    if (typeof resolvedValue === 'string') {
      try {
        resolvedValue = JSON.parse(resolvedValue);
      } catch {
        throw new Error(`Unable to parse rendered value: ${resolvedValue}`);
      }
    }

    if (!Array.isArray(resolvedValue)) {
      throw new Error(
        `Foreach expression must evaluate to an array. ` +
          `Expression "${expression}" resolved to ${typeof resolvedValue}${
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

    return resolvedValue;
  }

  private processForeachConfiguration(): unknown {
    const expression = this.node.configuration.foreach;

    if (!expression) {
      throw new Error(
        'Foreach configuration is required. Please specify an array or expression that evaluates to an array.'
      );
    }

    if (
      typeof expression === 'string' &&
      expression.startsWith('{{') &&
      expression.endsWith('}}')
    ) {
      return this.stepExecutionRuntime.contextManager.evaluateExpressionInContext(expression);
    }

    return this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(expression);
  }
}
