/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: Remove eslint exceptions comments and fix the issues
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { StepTypeDefinition, StepHandlerContext } from '@kbn/workflows';
import type { AtomicGraphNode } from '@kbn/workflows/graph';
import { BaseAtomicNodeImplementation, type RunStepResult } from './node_implementation';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger/workflow_event_logger';
import type { ConnectorExecutor } from '../connector_executor';

/**
 * Implementation for custom registered step types.
 *
 * This class executes custom step types registered via the registerStepType API.
 * It validates input against the step's schema, executes the handler function,
 * and validates the output.
 */
export class CustomStepImpl extends BaseAtomicNodeImplementation<any> {
  constructor(
    private node: AtomicGraphNode,
    private stepDefinition: StepTypeDefinition,
    stepExecutionRuntime: StepExecutionRuntime,
    connectorExecutor: ConnectorExecutor,
    workflowExecutionRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {
    // Convert node to BaseStep format for parent class
    const baseStep = {
      name: node.stepId,
      type: node.stepType,
      spaceId: '', // Will be available from context
    };
    super(baseStep, stepExecutionRuntime, connectorExecutor, workflowExecutionRuntime);
  }

  /**
   * Get and validate the input for this step
   */
  public override async getInput(): Promise<any> {
    const configuration = this.node.configuration;

    // Evaluate templates in the configuration
    const evaluatedConfig = this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(
      configuration
    );

    // Validate input against the step's input schema
    try {
      const validatedInput = this.stepDefinition.inputSchema.parse(evaluatedConfig);
      return validatedInput;
    } catch (error) {
      throw new Error(
        `Input validation failed for step type "${this.stepDefinition.id}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Execute the custom step handler
   */
  protected override async _run(input: any): Promise<RunStepResult> {
    try {
      // Create the handler context
      const handlerContext: StepHandlerContext = {
        input,
        contextManager: {
          getContext: async () => {
            return this.stepExecutionRuntime.contextManager.getContext();
          },
          evaluateTemplate: async (template: string) => {
            const result = this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(
              template
            );
            return result;
          },
          setVariable: (key: string, value: any) => {
            this.stepExecutionRuntime.contextManager.setVariable(key, value);
          },
          getVariable: (key: string) => {
            return this.stepExecutionRuntime.contextManager.getVariable(key);
          },
        },
        logger: {
          debug: (message: string, meta?: object) => {
            this.workflowLogger.debug(message, meta);
          },
          info: (message: string, meta?: object) => {
            this.workflowLogger.info(message, meta);
          },
          warn: (message: string, meta?: object) => {
            this.workflowLogger.warn(message, meta);
          },
          error: (message: string, meta?: object) => {
            this.workflowLogger.error(message, meta);
          },
        },
        abortSignal: this.stepExecutionRuntime.abortController.signal,
        stepId: this.node.stepId,
        stepType: this.node.stepType,
      };

      // Execute the handler
      const result = await this.stepDefinition.handler(handlerContext);

      // Check if handler returned an error
      if (result.error) {
        return {
          input,
          output: result.output,
          error: result.error.message || 'Unknown error from custom step handler',
        };
      }

      // Validate output against the step's output schema
      let validatedOutput = result.output;
      if (result.output !== undefined && result.output !== null) {
        try {
          validatedOutput = this.stepDefinition.outputSchema.parse(result.output);
        } catch (error) {
          throw new Error(
            `Output validation failed for step type "${this.stepDefinition.id}": ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      return {
        input,
        output: validatedOutput,
        error: undefined,
      };
    } catch (error) {
      // Handle any unexpected errors
      return {
        input,
        output: undefined,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

