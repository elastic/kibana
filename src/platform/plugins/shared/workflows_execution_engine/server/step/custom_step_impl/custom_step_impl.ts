/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AtomicGraphNode } from '@kbn/workflows/graph';
import { ExecutionError } from '@kbn/workflows/server';
import type { ServerStepDefinition, StepHandlerContext } from '@kbn/workflows-extensions/server';
import { handlePollingStep } from './handle_polling_step';
import { createHandlerContext } from './step_context_handler';
import type { ConnectorExecutor } from '../../connector_executor';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import { BaseAtomicNodeImplementation } from '../node_implementation';
import type { BaseStep, CancellableNode, RunStepResult } from '../node_implementation';

/**
 * Implementation for custom registered step types.
 *
 * This class executes custom step types registered via the registerStepType API.
 * It validates input against the step's schema, executes the handler function,
 * and validates the output.
 *
 * When the step definition provides an `onCancel` handler, instances expose
 * the `CancellableNode.onCancel` method so the execution engine can invoke
 * cleanup on cancellation.
 */
export class CustomStepImpl extends BaseAtomicNodeImplementation<BaseStep> {
  constructor(
    private node: AtomicGraphNode,
    private stepDefinition: ServerStepDefinition,
    stepExecutionRuntime: StepExecutionRuntime,
    connectorExecutor: ConnectorExecutor,
    workflowExecutionRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {
    const baseStep: BaseStep = {
      name: node.stepId,
      stepId: node.stepId,
      type: node.stepType,
      'max-step-size': node.configuration['max-step-size'],
    };
    super(baseStep, stepExecutionRuntime, connectorExecutor, workflowExecutionRuntime);

    if (stepDefinition.onCancel) {
      const onCancelFn = stepDefinition.onCancel;
      (this as unknown as CancellableNode).onCancel = async () => {
        await onCancelFn(this.createHandlerContext(this.getInput()));
      };
    }
  }

  /**
   * Get and validate the input for this step
   */
  public override getInput(): Record<string, unknown> {
    const withData = this.node.configuration.with || {};
    return this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(withData);
  }

  /**
   * Execute the custom step handler
   */
  protected override async _run(input: unknown): Promise<RunStepResult> {
    try {
      let stepResult: RunStepResult | undefined;

      if (this.stepDefinition.handler) {
        const handlerContext = this.createHandlerContext(input);
        const handlerResult = await this.stepDefinition.handler(handlerContext);
        stepResult = { input, output: handlerResult.output, error: undefined };
        if (handlerResult.error) {
          stepResult.error = ExecutionError.fromError(handlerResult.error).toSerializableObject();
        }

        return stepResult;
      }
      if ((this.stepDefinition.run && this.stepDefinition.poll) || this.stepDefinition.poll) {
        return handlePollingStep(
          input,
          this.getInput(),
          this.node.configuration || {},
          this.stepDefinition,
          this.node,
          this.stepExecutionRuntime,
          this.workflowLogger
        );
      }

      throw new Error(`Step "${this.node.stepType}" has no executable phase.`);
    } catch (err) {
      const error = ExecutionError.fromError(err).toSerializableObject();
      return { input, output: undefined, error };
    }
  }

  private createHandlerContext(input: unknown): StepHandlerContext {
    return createHandlerContext(
      input,
      this.node.configuration.with || {},
      this.node.configuration || {},
      this.node,
      this.stepExecutionRuntime,
      this.workflowLogger
    );
  }
}
