/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterForeachNode } from '@kbn/workflows';
import type { StepImplementation } from '../step_base';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';
import type { WorkflowContextManager } from '../../workflow_context_manager/workflow_context_manager';

export class EnterForeachNodeImpl implements StepImplementation {
  constructor(
    private step: EnterForeachNode,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager,
    private contextManager: WorkflowContextManager,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  public async run(): Promise<void> {
    this.wfExecutionRuntimeManager.enterScope();
    let foreachState = this.wfExecutionRuntimeManager.getStepState(this.step.id);

    if (!foreachState) {
      await this.wfExecutionRuntimeManager.startStep(this.step.id);
      const evaluatedItems = this.getItems();

      if (evaluatedItems.length === 0) {
        this.workflowLogger.logDebug(
          `Foreach step "${this.step.id}" has no items to iterate over. Skipping execution.`
        );
        await this.wfExecutionRuntimeManager.setStepState(this.step.id, {
          items: [],
          total: 0,
        });
        await this.wfExecutionRuntimeManager.finishStep(this.step.id);
        this.wfExecutionRuntimeManager.goToStep(this.step.exitNodeId);
        return;
      }

      this.workflowLogger.logDebug(
        `Foreach step "${this.step.id}" will iterate over ${evaluatedItems.length} items.`
      );

      // Initialize foreach state
      foreachState = {
        items: evaluatedItems,
        item: evaluatedItems[0],
        index: 0,
        total: evaluatedItems.length,
      };
    } else {
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
    }

    await this.wfExecutionRuntimeManager.setStepState(this.step.id, foreachState);
    this.wfExecutionRuntimeManager.goToNextStep();
  }

  private getItems(): any[] {
    let items: any[] = [];

    if (!this.step.configuration.foreach) {
      throw new Error('Foreach configuration is required');
    }

    try {
      items = JSON.parse(this.step.configuration.foreach);
    } catch (error) {
      const { value, pathExists } = this.contextManager.readContextPath(
        this.step.configuration.foreach
      );

      if (!pathExists) {
        throw new Error(
          `Foreach configuration path "${this.step.configuration.foreach}" does not exist in the workflow context.`
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
