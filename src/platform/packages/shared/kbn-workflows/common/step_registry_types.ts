/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ZodSchema } from '@kbn/zod';

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
     * Get the full workflow context including inputs, steps, env, and variables
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getContext(): Promise<Record<string, any>>;

    /**
     * Evaluate a template string using the workflow context
     */
    evaluateTemplate(template: string): Promise<string>;

    /**
     * Set a variable in the workflow context
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setVariable(key: string, value: any): void;

    /**
     * Get a variable from the workflow context
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getVariable(key: string): any;
  };

  /**
   * Logger scoped to this step execution
   */
  logger: {
    debug(message: string, meta?: object): void;
    info(message: string, meta?: object): void;
    warn(message: string, meta?: object): void;
    error(message: string, meta?: object): void;
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
export interface StepHandlerResult {
  /**
   * Output data from the step execution
   * This will be available to subsequent steps via template expressions
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output?: any;

  /**
   * Optional error information if the step failed
   */
  error?: {
    message: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details?: any;
  };
}

/**
 * Handler function signature for custom step types
 */
export type StepHandler = (context: StepHandlerContext) => Promise<StepHandlerResult>;

/**
 * Definition of a custom step type that can be registered
 */
export interface StepTypeDefinition {
  /**
   * Unique identifier for this step type (e.g., 'setvar', 'custom_http')
   * This will be used in workflow YAML as the step type
   */
  id: string;

  /**
   * Human-readable title for the step type
   */
  title: string;

  /**
   * Optional detailed description of what this step does
   */
  description?: string;

  /**
   * Zod schema defining the expected input structure for this step
   * Input will be validated against this schema before handler execution
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputSchema: ZodSchema<any>;

  /**
   * Zod schema defining the output structure from this step
   * This helps document what data subsequent steps can access
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  outputSchema: ZodSchema<any>;

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

