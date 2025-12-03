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
import type { z } from '@kbn/zod/v4';
import type { CommonStepDefinition, InferStepInput, InferStepOutput } from '../../common';

/**
 * Definition of a server-side workflow step extension.
 * Contains the technical/behavioral implementation of a step.
 *
 * The input and output types are automatically inferred from the inputSchema and outputSchema,
 * so you don't need to specify them explicitly. Use `createServerStepDefinition` helper function
 * for the best type inference experience.
 *
 * @example
 * ```typescript
 * // Option 1: Using the helper function (recommended for best type inference)
 * const myStepDefinition = createServerStepDefinition({
 *   id: 'custom.myStep',
 *   inputSchema: z.object({ message: z.string() }),
 *   outputSchema: z.object({ result: z.string() }),
 *   handler: async (context) => {
 *     // context.input is automatically typed as { message: string }
 *     return { output: { result: context.input.message } };
 *   },
 * });
 *
 * // Option 2: Using type annotation (works but may require explicit types in some cases)
 * const myStepDefinition: ServerStepDefinition = {
 *   id: 'custom.myStep',
 *   inputSchema: z.object({ message: z.string() }),
 *   outputSchema: z.object({ result: z.string() }),
 *   handler: async (context) => {
 *     return { output: { result: context.input.message } };
 *   },
 * };
 * ```
 */
export type ServerStepDefinition<TCommon extends CommonStepDefinition = CommonStepDefinition> =
  TCommon & {
    /**
     * The handler function that executes this step's logic.
     * Input and output types are automatically inferred from the schemas.
     */
    handler: StepHandler<InferStepInput<TCommon>, InferStepOutput<TCommon>>;
  };

/**
 * Helper function to create a ServerStepDefinition with automatic type inference.
 * This ensures that the handler's input and output types are correctly inferred
 * from the inputSchema and outputSchema without needing explicit type annotations.
 *
 * @example
 * ```typescript
 * const myStepDefinition = createServerStepDefinition({
 *   id: 'custom.myStep',
 *   inputSchema: z.object({ message: z.string() }),
 *   outputSchema: z.object({ result: z.string() }),
 *   handler: async (context) => {
 *     // context.input is typed as { message: string }
 *     // return type should be { output: { result: string } }
 *     return { output: { result: context.input.message } };
 *   },
 * });
 * ```
 */
export function createServerStepDefinition<
  TInputSchema extends z.ZodTypeAny,
  TOutputSchema extends z.ZodTypeAny
>(
  definition: ServerStepDefinition<CommonStepDefinition<TInputSchema, TOutputSchema>>
): ServerStepDefinition<CommonStepDefinition<TInputSchema, TOutputSchema>> {
  return definition;
}

/**
 * Handler function that executes a custom workflow step.
 * This function is called by the execution engine to run the step logic.
 *
 * @param context - The runtime context for the step execution
 * @returns The step output (should conform to outputSchema)
 */
export type StepHandler<TInput = unknown, TOutput = unknown> = (
  context: StepHandlerContext<TInput>
) => Promise<StepHandlerResult<TOutput>>;

/**
 * Context provided to custom step handlers during execution.
 * This gives access to runtime services needed for step execution.
 */
export interface StepHandlerContext<TInput = unknown> {
  /**
   * The validated input provided to the step based on inputSchema
   */
  input: TInput;

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
    renderInputTemplate<T>(input: T): T;
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
