/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { OrStringRecursive } from '@kbn/utility-types';
import type { StepContext } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '../../common';

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
export interface ServerStepDefinition<
  Input extends z.ZodType = z.ZodType,
  Output extends z.ZodType = z.ZodType,
  Config extends z.ZodObject = z.ZodObject
> extends CommonStepDefinition<Input, Output, Config> {
  /**
   * The handler function that executes this step's logic.
   * Input and output types are automatically inferred from the schemas.
   */
  handler: StepHandler<Input, Output, Config>;
}

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
  Input extends z.ZodType = z.ZodType,
  Output extends z.ZodType = z.ZodType,
  Config extends z.ZodObject = z.ZodObject
>(
  definition: ServerStepDefinition<Input, Output, Config>
): ServerStepDefinition<Input, Output, Config> {
  return definition;
}

/**
 * Handler function that executes a custom workflow step.
 * This function is called by the execution engine to run the step logic.
 *
 * @param context - The runtime context for the step execution
 * @returns The step output (should conform to outputSchema)
 */
export type StepHandler<
  Input extends z.ZodType = z.ZodType,
  Output extends z.ZodType = z.ZodType,
  Config extends z.ZodObject = z.ZodObject
> = (context: StepHandlerContext<Input, Config>) => Promise<StepHandlerResult<Output>>;

/**
 * Context provided to custom step handlers during execution.
 * This gives access to runtime services needed for step execution.
 */
export interface StepHandlerContext<TInput = z.ZodType, TConfig = z.ZodObject> {
  /**
   * The validated input provided to the step based on inputSchema
   */
  input: z.infer<TInput>;

  /**
   * The config provided to the step based on configSchema
   */
  config: z.infer<TConfig>;

  /**
   * The raw input configuration before template rendering.
   * Has the same shape as input, but values may contain template strings.
   */
  rawInput: OrStringRecursive<z.infer<TInput>>;

  /**
   * Runtime context manager for accessing workflow state, context, and template evaluation
   */
  contextManager: ContextManager;

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
 * Context manager for accessing step execution runtime services
 */
export interface ContextManager {
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
   * @param input - The value to render with template expressions
   * @param additionalContext - Optional additional context to merge with workflow context
   */
  renderInputTemplate<T>(input: T, additionalContext?: Record<string, unknown>): T;

  /**
   * Returns the fake request
   */
  getFakeRequest(): KibanaRequest;
}

/**
 * Result returned by a custom step handler
 */
export interface StepHandlerResult<TOutput extends z.ZodType = z.ZodType> {
  /**
   * Output data from the step execution
   * This will be available to subsequent steps via template expressions
   */
  output?: z.infer<TOutput>;
  /**
   * Optional error information if the step failed
   */
  error?: Error;
}
