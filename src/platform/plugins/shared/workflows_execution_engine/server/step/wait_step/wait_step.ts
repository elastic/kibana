/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { WaitGraphNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { NodeImplementation } from '../node_implementation';

export class WaitStepImpl implements NodeImplementation {
  constructor(
    private node: WaitGraphNode,
    private stepExecutionRuntime: StepExecutionRuntime,
    private workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  async run(): Promise<void> {
    if (this.stepExecutionRuntime.tryEnterDelay(this.node.configuration.with.duration)) {
      this.workflowLogger.logDebug(
        `Waiting for ${this.node.configuration.with.duration} in step ${this.node.id}`
      );
      return;
    }

    this.exitWait();
  }

  private exitWait(): void {
    this.stepExecutionRuntime.finishStep();
    this.workflowLogger.logDebug(
      `Finished waiting for ${this.node.configuration.with.duration} in step ${this.node.id}`
    );
    this.workflowRuntime.navigateToNextNode();
  }
}
