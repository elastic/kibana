/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterForeachNode } from '@kbn/workflows/graph';
import type { NodeImplementation } from '../node_implementation';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';
import type { WorkflowContextManager } from '../../workflow_context_manager/workflow_context_manager';

export class EnterForeachNodeImpl implements NodeImplementation {
  constructor(
    private node: EnterForeachNode,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager,
    private contextManager: WorkflowContextManager,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  public async run(): Promise<void> {
    if (!this.wfExecutionRuntimeManager.getCurrentStepState()) {
      await this.enterForeach();
    } else {
      await this.advanceIteration();
    }
  }

  private async enterForeach(): Promise<void> {
    let foreachState = this.wfExecutionRuntimeManager.getCurrentStepState();
    await this.wfExecutionRuntimeManager.startStep();
    const evaluatedItems = this.getItems();

    if (evaluatedItems.length === 0) {
      this.workflowLogger.logDebug(
        `Foreach step "${this.node.stepId}" has no items to iterate over. Skipping execution.`,
        {
          workflow: { step_id: this.node.stepId },
        }
      );
      await this.wfExecutionRuntimeManager.setCurrentStepState({
        items: [],
        total: 0,
      });
      await this.wfExecutionRuntimeManager.finishStep();
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

    await this.wfExecutionRuntimeManager.setCurrentStepState(foreachState);
    // Enter a new scope for the first iteration
    this.wfExecutionRuntimeManager.enterScope(foreachState.index!.toString());
    this.wfExecutionRuntimeManager.navigateToNextNode();
  }

  private async advanceIteration(): Promise<void> {
    let foreachState = this.wfExecutionRuntimeManager.getCurrentStepState()!;
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
    this.wfExecutionRuntimeManager.enterScope(foreachState.index!.toString());
    await this.wfExecutionRuntimeManager.setCurrentStepState(foreachState);
    this.wfExecutionRuntimeManager.navigateToNextNode();
  }

  private getItems(): any[] {
    let items: any[] = [];

    if (!this.node.configuration.foreach) {
      throw new Error('Foreach configuration is required');
    }

    try {
      items = JSON.parse(this.node.configuration.foreach);
    } catch (error) {
      const { value, pathExists } = this.contextManager.readContextPath(
        this.node.configuration.foreach
      );

      if (!pathExists) {
        throw new Error(
          `Foreach configuration path "${this.node.configuration.foreach}" does not exist in the workflow context.`
        );
      }

      if (Array.isArray(value)) {
        items = value;
      } else if (typeof value === 'string') {
        items = JSON.parse(value);
      }
    }

    if (!Array.isArray(items)) {
      throw new Error('Foreach configuration must be an array');
    }

    return items;
  }
}
