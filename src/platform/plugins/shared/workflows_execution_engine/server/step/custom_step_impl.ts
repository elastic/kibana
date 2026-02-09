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
import type { BaseStep, RunStepResult } from './node_implementation';
import { BaseAtomicNodeImplementation } from './node_implementation';
import type { ConnectorExecutor } from '../connector_executor';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger';

/**
 * Implementation for custom registered step types.
 *
 * This class executes custom step types registered via the registerStepType API.
 * It validates input against the step's schema, executes the handler function,
 * and validates the output.
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
    // Convert node to BaseStep format for parent class
    const baseStep: BaseStep = {
      name: node.stepId,
      type: node.stepType,
      spaceId: '', // Will be available from context
    };
    super(baseStep, stepExecutionRuntime, connectorExecutor, workflowExecutionRuntime);
  }

  /**
   * Get and validate the input for this step
   */
  public override getInput(): unknown {
    const withData = this.node.configuration.with || {};
    return this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(withData);
  }

  /**
   * Execute the custom step handler
   */
  protected override async _run(input: unknown): Promise<RunStepResult> {
    try {
      const handlerContext = this.createHandlerContext(input);
      const result = await this.stepDefinition.handler(handlerContext);

      const stepResult: RunStepResult = { input, output: result.output, error: undefined };
      if (result.error) {
        stepResult.error = ExecutionError.fromError(result.error).toSerializableObject();
      }
      return stepResult;
    } catch (err) {
      const error = ExecutionError.fromError(err).toSerializableObject();
      return { input, output: undefined, error };
    }
  }

  /**
   * Create the handler context
   */
  private createHandlerContext(input: unknown): StepHandlerContext {
    return {
      input,
      rawInput: this.node.configuration.with || {},
      config: this.node.configuration, // TODO: pick only the config properties that are defined in the step definition
      contextManager: {
        getContext: () => {
          return this.stepExecutionRuntime.contextManager.getContext();
        },
        getScopedEsClient: () => {
          return this.stepExecutionRuntime.contextManager.getEsClientAsUser();
        },
        renderInputTemplate: (value, additionalContext) => {
          return this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(
            value,
            additionalContext
          );
        },
        getFakeRequest: () => {
          return this.stepExecutionRuntime.contextManager.getFakeRequest();
        },
      },
      logger: {
        debug: (message, meta) => this.workflowLogger.logDebug(message, meta),
        info: (message, meta) => this.workflowLogger.logInfo(message, meta),
        warn: (message, meta) => this.workflowLogger.logWarn(message, meta),
        error: (message, error) => this.workflowLogger.logError(message, error),
      },
      abortSignal: this.stepExecutionRuntime.abortController.signal,
      stepId: this.node.stepId,
      stepType: this.node.stepType,
    };
  }
}
