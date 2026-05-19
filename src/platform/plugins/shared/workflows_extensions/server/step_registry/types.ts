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
 * Result returned by a legacy single-`handler` step. Kept for backward
 * compatibility with existing step authors using `handler`.
 */
export interface StepHandlerResult<TOutput extends z.ZodType = z.ZodType> {
  output?: z.infer<TOutput>;
  error?: Error;
}

// -----------------------------------------------------------------------------
// Poll step types
// -----------------------------------------------------------------------------

/**
 * Handler for a `run` phase that completes synchronously (output or error only).
 * Used by {@link RunWithHandoffHandler} as the non-hand-off branch; single-shot
 * steps use {@link StepHandler} (`handler`) instead of `run` without `poll`.
 */
/**
 * Default ceilings applied when a poll-based step omits {@link PollCeilings}.
 * Conservative values that prevent runaway polling but are loose enough for
 * most real-world async jobs (background ML tasks, Osquery actions, etc.).
 */
export const DEFAULT_POLL_CEILINGS: Required<PollCeilings> = {
  maxAttempts: 120,
  maxWaitMs: 60 * 60_000,
};

// -----------------------------------------------------------------------------
// Result types
// -----------------------------------------------------------------------------

/** Successful run/poll outcome — step has produced its final output. */
export interface PhaseDoneResult<Output extends z.ZodType = z.ZodType> {
  output: z.infer<Output>;
  error?: never;
}

/**
 * Poll-phase continuation: the step is not done yet. The engine schedules the
 * next wake-up from {@link PollPolicy} unless a positive `nextPollDelayMs` is
 * returned (that value is used from **now** for the next wake-up only).
 * The handler may optionally update the persisted author state.
 */
export interface PollContinueResult<State extends z.ZodObject = z.ZodObject> {
  output?: never;
  /**
   * Optional updated author state. Omit to keep the previously persisted state.
   * Pass `null` to explicitly clear it.
   */
  state?: z.infer<State> | null;
  /**
   * Optional delay (ms) until the next poll. When omitted or non-positive, the
   * engine uses {@link PollPolicy} for the next wake-up.
   */
  nextPollDelayMs?: number;
  error?: never;
}

/** Failure outcome — same shape as the existing single-handler result. */
export interface PhaseErrorResult {
  output?: undefined;
  state?: undefined;
  error: Error;
}

export type DurablePhaseResult<
  Output extends z.ZodType = z.ZodType,
  State extends z.ZodObject = z.ZodObject
> = PhaseDoneResult<Output> | PollContinueResult<State> | PhaseErrorResult;

/**
 * Handler for a `run` phase that hands off to a `poll` phase.
 * Returns either a final output (synchronous completion) or `{ state }`
 * to start the polling loop.
 */
export type RunWithHandoffHandler<
  Input extends z.ZodType = z.ZodType,
  Output extends z.ZodType = z.ZodType,
  Config extends z.ZodObject = z.ZodObject,
  State extends z.ZodObject = z.ZodObject
> = (context: StepHandlerContext<Input, Config>) => Promise<DurablePhaseResult<Output, State>>;

/**
 * Handler for a `poll` phase. Receives the persisted author `state` alongside
 * the regular step handler context. Returns either the final output or
 * `{ state? }` to continue polling.
 */
export type PollHandler<
  Input extends z.ZodType = z.ZodType,
  Output extends z.ZodType = z.ZodType,
  Config extends z.ZodObject = z.ZodObject,
  State extends z.ZodObject = z.ZodObject
> = (context: PollContext<Input, Config, State>) => Promise<DurablePhaseResult<Output, State>>;

/**
 * Handler function that executes a custom workflow step.
 * Legacy alias retained for backward compatibility with step definitions that
 * use the `handler` field. New step authors should use `run` (and optionally
 * `poll`) instead.
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
 * Cancellation cleanup handler for custom workflow steps.
 * Receives the same context as the main handler so it has access to input,
 * config, and runtime services needed for cleanup.
 *
 * `onCancel` fires after the abort signal triggers, in both the `RUNNING`
 * and `WAITING` states. Durable poll steps therefore get a guaranteed
 * cleanup entry point even when they were suspended between polls — handy
 * for cancelling externally-tracked jobs (e.g. an Osquery action created in
 * `run()`) without waiting for the next wake-up.
 *
 * Implementations must be idempotent. Errors thrown here are logged but do
 * not disrupt the cancellation flow.
 */
export type OnCancelHandler<
  Input extends z.ZodType = z.ZodType,
  Config extends z.ZodObject = z.ZodObject
> = (context: StepHandlerContext<Input, Config>) => Promise<void> | void;

// -----------------------------------------------------------------------------
// Poll policy + ceilings
// -----------------------------------------------------------------------------

/**
 * Strategy for computing the next poll wake-up. Cadence is owned by the step
 * author at definition time and is intentionally not configurable from YAML.
 *
 * - `fixed`        — constant interval between every poll.
 * - `exponential`  — `initialMs` scaled by `multiplier` (default 2, same name as
 *                    on-failure retry) each attempt, capped at `maxMs`. With
 *                    `jitter` enabled, uses the same backoff jitter as on-failure
 *                    retry: a uniform delay in `[computed/2, computed]` ms.
 */
export type PollPolicy =
  | { strategy: 'fixed'; intervalMs: number }
  | {
      strategy: 'exponential';
      initialMs: number;
      maxMs: number;
      multiplier?: number;
      jitter?: boolean;
    };

/**
 * Engine-enforced ceilings for a poll-based step. Both default to
 * {@link DEFAULT_POLL_CEILINGS} when omitted.
 *
 * When a ceiling is exceeded the step fails with an `ExecutionError` of type
 * `'PollCeilingExceeded'` whose `details` indicate which ceiling tripped.
 */
export interface PollCeilings {
  /** Maximum number of `poll.handler` invocations before failing the step. */
  maxAttempts?: number;
  /** Maximum wall-clock time (ms) the step may spend in `WAITING` before failing. */
  maxWaitMs?: number;
}

/**
 * Definition of the `poll` phase of a step. `policy` is required; `ceilings`
 * default to {@link DEFAULT_POLL_CEILINGS}.
 */
export interface PollLifecycle<
  Input extends z.ZodType = z.ZodType,
  Output extends z.ZodType = z.ZodType,
  Config extends z.ZodObject = z.ZodObject,
  State extends z.ZodObject = z.ZodObject
> {
  handler: PollHandler<Input, Output, Config, State>;
  policy: PollPolicy;
  ceilings?: PollCeilings;
}

// -----------------------------------------------------------------------------
// Step definition union
// -----------------------------------------------------------------------------

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

  /**
   * Optional cancellation cleanup handler.
   *
   * Called after the step's abort signal fires and `run()` completes, giving the
   * step a guaranteed cleanup entry point (e.g. cancelling spawned child operations).
   * Only invoked when the workflow is being cancelled — normal completions skip it.
   *
   * Implementations must be idempotent. Errors thrown here are logged but do not
   * disrupt the cancellation flow.
   */
  onCancel?: OnCancelHandler<Input, Config>;
}

/**
 * Full server definition for **`run` + `poll`**. Same fields as the corresponding
 * branch of {@link ServerStepDefinition}, kept separate for overload-friendly helpers.
 */
export type RunPlusPollStepDefinition<
  Input extends z.ZodType = z.ZodType,
  Output extends z.ZodType = z.ZodType,
  Config extends z.ZodObject = z.ZodObject,
  State extends z.ZodObject = z.ZodObject
> = Omit<CommonStepDefinition<Input, Output, Config>, 'handler'> & {
  run: RunWithHandoffHandler<Input, Output, Config, State>;
  poll: PollLifecycle<Input, Output, Config, State>;
  stateSchema?: State;
};

/**
 * Full server definition for **`poll` only**. Same fields as the corresponding
 * branch of {@link ServerStepDefinition}, kept separate for overload-friendly helpers.
 */
export type PollOnlyStepDefinition<
  Input extends z.ZodType = z.ZodType,
  Output extends z.ZodType = z.ZodType,
  Config extends z.ZodObject = z.ZodObject,
  State extends z.ZodObject = z.ZodObject
> = Omit<CommonStepDefinition<Input, Output, Config>, 'handler'> & {
  poll: PollLifecycle<Input, Output, Config, State>;
  stateSchema?: State;
};

export type PollStepDefinition<
  Input extends z.ZodType = z.ZodType,
  Output extends z.ZodType = z.ZodType,
  Config extends z.ZodObject = z.ZodObject,
  State extends z.ZodObject = z.ZodObject
> =
  | PollOnlyStepDefinition<Input, Output, Config, State>
  | RunPlusPollStepDefinition<Input, Output, Config, State>;

// -----------------------------------------------------------------------------
// Helper: createServerStepDefinition (overloaded)
// -----------------------------------------------------------------------------

/**
 * Helper function to create a {@link ServerStepDefinition} with full type
 * inference for input, output, config, and (when applicable) author state.
 *
 * Three overloads (plus the implementation), one per mode shape, give clean
 * TypeScript errors when a definition is malformed (e.g. omitting `policy` from
 * a `poll` lifecycle). {@link RunPlusPollMode} is listed first so `run`+`poll`
 * does not bind to {@link RunOnlyMode} (which is `handler` only).
 *
 * Performs the following runtime guards in addition to the static checks:
 * - Throws if neither `handler`, `run`, nor `poll` is defined.
 * - Throws if `policy` is missing or structurally invalid.
 * - Defaults missing `poll.ceilings` to {@link DEFAULT_POLL_CEILINGS} so the
 *   registry can warn at registration time.
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
 * Like {@link createServerStepDefinition} but only for definitions that include **`poll`**
 * (`run` + `poll` or **`poll` only**). Narrows inference so single-`handler` steps are excluded.
 */
export function createPollServerStepDefinition<
  Input extends z.ZodType = z.ZodType,
  Output extends z.ZodType = z.ZodType,
  Config extends z.ZodObject = z.ZodObject,
  State extends z.ZodObject = z.ZodObject
>(
  definition:
    | PollOnlyStepDefinition<Input, Output, Config, State>
    | RunPlusPollStepDefinition<Input, Output, Config, State>
): PollStepDefinition<Input, Output, Config, State> {
  return definition;
}

// -----------------------------------------------------------------------------
// Handler context shapes
// -----------------------------------------------------------------------------

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
 * Context passed to a {@link PollHandler}. Extends {@link StepHandlerContext}
 * with the persisted author `state` from the previous run/poll invocation.
 */
export interface PollContext<TInput = z.ZodType, TConfig = z.ZodObject, TState = z.ZodObject>
  extends StepHandlerContext<TInput, TConfig> {
  /**
   * Author state persisted by the most recent run/poll invocation.
   * Undefined on the first poll of a poll-only step (no `run` to seed it).
   */
  state: z.infer<TState> | undefined;

  /**
   * 0-based index of this `poll.handler` invocation (first poll is `0`, including
   * the first wake-up after `run` returns `{ state }` on a `run` + `poll` step).
   */
  attempt: number;
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
