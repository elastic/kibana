/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { WaitGraphNode } from '@kbn/workflows/graph';
import { renderDuration } from '../../utils';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { NodeImplementation } from '../node_implementation';

/** Duration is frozen on step state at wait entry so the exit log reports the same value. */
const RESOLVED_DURATION_STATE_KEY = 'resolvedDuration' as const;

export class WaitStepImpl implements NodeImplementation {
  constructor(
    private node: WaitGraphNode,
    private stepExecutionRuntime: StepExecutionRuntime,
    private workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  async run(): Promise<void> {
    const duration = this.resolveDuration();

    if (this.stepExecutionRuntime.tryEnterDelay(duration)) {
      this.stepExecutionRuntime.setCurrentStepState({
        ...(this.stepExecutionRuntime.stepExecution?.state ?? {}),
        [RESOLVED_DURATION_STATE_KEY]: duration,
      });
      this.workflowLogger.logDebug(`Waiting for ${duration} in step ${this.node.id}`);
      return;
    }

    this.exitWait(duration);
  }

  /**
   * Renders `with.duration` against the workflow context, so a template such as
   * `{{ inputs.waitFor | default: '5s' }}` resolves before the delay is scheduled.
   * On resume the value frozen at entry is reused, since the context may have moved on.
   */
  private resolveDuration(): string {
    const persisted = this.stepExecutionRuntime.stepExecution?.state?.[
      RESOLVED_DURATION_STATE_KEY
    ] as string | undefined;

    if (typeof persisted === 'string' && persisted.length > 0) {
      return persisted;
    }

    return renderDuration(this.node.configuration.with.duration, (value) =>
      this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(value)
    );
  }

  private exitWait(duration: string): void {
    this.stepExecutionRuntime.finishStep();
    this.workflowLogger.logDebug(`Finished waiting for ${duration} in step ${this.node.id}`);
    this.workflowRuntime.navigateToNextNode();
  }
}
