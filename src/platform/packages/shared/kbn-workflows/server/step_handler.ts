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
import type { z } from '@kbn/zod/v4';
import type { BaseStepDefinition } from '../spec/step_definition_types';
import type { StepContext } from '../spec/schema';

/**
 * Definition of a server-side workflow step extension.
 * Contains the technical/behavioral implementation of a step.
 */
export interface ServerStepDefinition<
  Input extends z.ZodType = z.ZodType,
  Output extends z.ZodType = z.ZodType,
  Config extends z.ZodObject = z.ZodObject
> extends BaseStepDefinition<Input, Output, Config> {
  handler: StepHandler<Input, Output, Config>;
  onCancel?: OnCancelHandler<Input, Config>;
}

/**
 * Helper function to create a ServerStepDefinition with automatic type inference.
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

export type StepHandler<
  Input extends z.ZodType = z.ZodType,
  Output extends z.ZodType = z.ZodType,
  Config extends z.ZodObject = z.ZodObject
> = (context: StepHandlerContext<Input, Config>) => Promise<StepHandlerResult<Output>>;

export type OnCancelHandler<
  Input extends z.ZodType = z.ZodType,
  Config extends z.ZodObject = z.ZodObject
> = (context: StepHandlerContext<Input, Config>) => Promise<void> | void;

export interface StepHandlerContext<TInput = z.ZodType, TConfig = z.ZodObject> {
  input: z.infer<TInput>;
  config: z.infer<TConfig>;
  rawInput: OrStringRecursive<z.infer<TInput>>;
  contextManager: ContextManager;
  logger: {
    debug(message: string, meta?: object): void;
    info(message: string, meta?: object): void;
    warn(message: string, meta?: object): void;
    error(message: string, error?: Error): void;
  };
  abortSignal: AbortSignal;
  stepId: string;
  stepType: string;
}

export interface ContextManager {
  getContext(): StepContext;
  getScopedEsClient(): ElasticsearchClient;
  renderInputTemplate<T>(input: T, additionalContext?: Record<string, unknown>): T;
  getFakeRequest(): KibanaRequest;
}

export interface StepHandlerResult<TOutput extends z.ZodType = z.ZodType> {
  output?: z.infer<TOutput>;
  error?: Error;
}
