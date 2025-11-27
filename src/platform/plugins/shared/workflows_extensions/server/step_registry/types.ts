/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { StepContext } from '@kbn/workflows';
import type { CommonStepDefinition } from '../../common';

/**
 * Definition of a server-side workflow step extension.
 * Contains the technical/behavioral implementation of a step.
 */
export interface ServerStepDefinition extends CommonStepDefinition {
  /**
   * The handler function that executes this step's logic
   */
  handler: StepHandler;

  /**
   * Optional timeout for this step type (e.g., '5m', '30s')
   * If not specified, uses workflow-level or default timeout
   */
  timeout?: string;
}

/**
 * Handler function that executes a custom workflow step.
 * This function is called by the execution engine to run the step logic.
 *
 * @param input - The step input parameters (validated against inputSchema)
 * @param context - The runtime context for the step execution
 * @returns The step output (should conform to outputSchema)
 */
export type StepHandler = (context: StepHandlerContext) => Promise<StepHandlerResult>;

/**
 * Context provided to custom step handlers during execution.
 * This gives access to runtime services needed for step execution.
 */
export interface StepHandlerContext {
  /**
   * The validated input provided to the step based on inputSchema
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: any;

  /**
   * Runtime context manager for accessing workflow state, context, and template evaluation
   */
  contextManager: {
    /**
     * Get the full context
     */
    getContext(): StepContext;

    /**
     * Get the scoped Elasticsearch client
     */
    getScopedEsClient(): ElasticsearchClient;

    /**
     * Evaluate a template string using the workflow context
     */
    renderInputTemplate(input: string): string;
    /**
     * Set the persistent state for this step.
     * State is persisted and accessible in subsequent steps via {{ steps.stepName.key }}
     * This allows custom steps to store data that can be referenced later in the workflow.
     *
     * @example
     * // In a setvar step:
     * context.contextManager.setStepState({ x: 10, userName: "Alice" });
     *
     * // In a later step, access via:
     * // {{ steps.setVarStep.x }} or {{ steps.setVarStep.userName }}
     */
    setStepState(state: Record<string, unknown>): void;

    /**
     * Get the current persistent state for this step
     */
    getStepState(): Record<string, unknown> | undefined;
  };

  /**
   * Logger scoped to this step execution
   */
  logger: {
    debug(message: string, meta?: object): void;
    info(message: string, meta?: object): void;
    warn(message: string, meta?: object): void;
    error(message: string, error?: Error): void;
  };

  /**
   * Abort signal for cancellation support
   */
  abortSignal: AbortSignal;

  /**
   * Current step's ID
   */
  stepId: string;

  /**
   * Current step's type
   */
  stepType: string;
}

/**
 * Result returned by a custom step handler
 */
export interface StepHandlerResult<TOutput = unknown> {
  /**
   * Output data from the step execution
   * This will be available to subsequent steps via template expressions
   */
  output?: TOutput;
  /**
   * Optional error information if the step failed
   */
  error?: Error;
}
