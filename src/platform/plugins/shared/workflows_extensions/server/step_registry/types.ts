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
export interface PhaseDoneResult<TOutput> {
  output: TOutput;
  /** Optional error information if the step failed. */
  error?: never;
}

/**
 * Poll-phase continuation: the step is not done yet. The engine schedules the
 * next wake-up from {@link PollPolicy} unless a positive `nextPollDelayMs` is
 * returned (that value is used from **now** for the next wake-up only).
 * The handler may optionally update the persisted author state.
 */
export interface PollContinueResult<TState extends Record<string, unknown>> {
  output?: never;
  /**
   * Optional updated author state. Omit to keep the previously persisted state.
   * Pass `null` to explicitly clear it.
   */
  state?: TState | null;
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

/**
 * Result returned by a legacy single-`handler` step. Kept for backward
 * compatibility with existing step authors using `handler`.
 */
export interface StepHandlerResult<TOutput extends z.ZodType = z.ZodType> {
  output?: z.infer<TOutput>;
  error?: Error;
}

// -----------------------------------------------------------------------------
// Phase handler types
// -----------------------------------------------------------------------------

/**
 * Handler for a `run` phase that completes synchronously (output or error only).
 * Used by {@link RunWithHandoffHandler} as the non-hand-off branch; single-shot
 * steps use {@link StepHandler} (`handler`) instead of `run` without `poll`.
 */
export type RunDoneOnlyHandler<
  Input extends z.ZodType = z.ZodType,
  Output extends z.ZodType = z.ZodType,
  Config extends z.ZodObject = z.ZodObject
> = (
  context: StepHandlerContext<Input, Config>
) => Promise<PhaseDoneResult<z.infer<Output>> | PhaseErrorResult>;

export type DurablePhaseResult<
  Output extends z.ZodType = z.ZodType,
  State extends Record<string, unknown> = Record<string, unknown>
> = PhaseDoneResult<z.infer<Output>> | PollContinueResult<State> | PhaseErrorResult;

/**
 * Handler for a `run` phase that hands off to a `poll` phase.
 * Returns either a final output (synchronous completion) or `{ state }`
 * to start the polling loop.
 */
export type RunWithHandoffHandler<
  Input extends z.ZodType = z.ZodType,
  Output extends z.ZodType = z.ZodType,
  Config extends z.ZodObject = z.ZodObject,
  State extends Record<string, unknown> = Record<string, unknown>
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
  State extends Record<string, unknown> = Record<string, unknown>
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
export type PollPolicy<
  Input extends z.ZodType = z.ZodType,
  Config extends z.ZodObject = z.ZodObject,
  State = unknown
> =
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
  State = unknown
> {
  handler: PollHandler<Input, Output, Config, State>;
  policy: PollPolicy<Input, Config, State>;
  ceilings?: PollCeilings;
}

// -----------------------------------------------------------------------------
// Step definition union
// -----------------------------------------------------------------------------

/**
 * Definition of a server-side workflow step extension.
 * Contains the technical/behavioral implementation of a step.
 *
 * A step must declare exactly one of the following modes:
 *
 * - **`handler` only (single invocation)** — legacy {@link StepHandler}; one
 *   invocation returns `{ output }` or `{ error }`. No `run` and no `poll`.
 * - **`poll` only** — pure polling: no setup phase, the engine drives `poll`
 *   from the first execution onwards.
 * - **`run` + `poll`** — the only shape that uses **`run`**: a hand-off phase
 *   that may return `{ output }` / `{ error }` immediately, or `{ state }` to
 *   continue in `poll`, which is invoked on each wake-up until `{ output }`.
 *
 * Constraints enforced at compile time:
 * - At least one of `handler`, `run`, or `poll` must be defined.
 * - `handler` must not appear together with `run` or `poll`.
 * - `run` without `poll` is invalid — single-shot steps use `handler` only.
 * - When `poll` is defined, `policy` is required.
 *
 * Runtime guards in {@link createServerStepDefinition} catch the same
 * violations for callers that bypass the type system.
 *
 * @example Legacy handler (existing steps — no change required)
 * ```typescript
 * const myStepDefinition = createServerStepDefinition({
 *   id: 'custom.myStep',
 *   inputSchema: z.object({ message: z.string() }),
 *   outputSchema: z.object({ result: z.string() }),
 *   handler: async (context) => ({ output: { result: context.input.message } }),
 * });
 * ```
 *
 * @example New `run` + `poll` shape
 * ```typescript
 * const osqueryRunQuery = createServerStepDefinition({
 *   ...OsqueryRunQueryAndWaitStepCommonDefinition,
 *   run: async ({ input }) => {
 *     const action = await osqueryClient.actions.create(input);
 *     return { state: { actionId: action.action_id } };
 *   },
 *   poll: {
 *     handler: async ({ input, state }) => {
 *       const action = await osqueryClient.actions.get({ actionId: state.actionId });
 *       if (action.responded < input.agentIds.length) return { state };
 *       const results = await osqueryClient.results.get({ actionId: state.actionId });
 *       return { output: { rows: results.items } };
 *     },
 *     policy: { strategy: 'exponential', initialMs: 5_000, maxMs: 60_000, multiplier: 2, jitter: true },
 *     ceilings: { maxAttempts: 60, maxWaitMs: 30 * 60_000 },
 *   },
 * });
 * ```
 */
export type ServerStepDefinition<
  Input extends z.ZodType = z.ZodType,
  Output extends z.ZodType = z.ZodType,
  Config extends z.ZodObject = z.ZodObject,
  State = unknown
> = CommonStepDefinition<Input, Output, Config> & {
  onCancel?: OnCancelHandler<Input, Config>;
} & (
    | RunOnlyMode<Input, Output, Config>
    | PollOnlyMode<Input, Output, Config, State>
    | RunPlusPollMode<Input, Output, Config, State>
  );

/**
 * Single-invocation step: {@link StepHandler} only (no `run`, no `poll`).
 */
export interface RunOnlyMode<
  Input extends z.ZodType,
  Output extends z.ZodType,
  Config extends z.ZodObject
> {
  handler: StepHandler<Input, Output, Config>;
  run?: never;
  poll?: never;
}

/**
 * @deprecated Use {@link RunOnlyMode} (identical).
 */
export type LegacyHandlerMode<
  Input extends z.ZodType,
  Output extends z.ZodType,
  Config extends z.ZodObject
> = RunOnlyMode<Input, Output, Config>;

export interface PollOnlyMode<
  Input extends z.ZodType,
  Output extends z.ZodType,
  Config extends z.ZodObject,
  State
> {
  handler?: never;
  run?: never;
  poll: PollLifecycle<Input, Output, Config, State>;
}

export interface RunPlusPollMode<
  Input extends z.ZodType,
  Output extends z.ZodType,
  Config extends z.ZodObject,
  State extends Record<string, unknown> = Record<string, unknown>
> {
  handler?: never;
  run: RunWithHandoffHandler<Input, Output, Config, State>;
  poll: PollLifecycle<Input, Output, Config, State>;
}

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
  Config extends z.ZodObject = z.ZodObject,
  State = unknown
>(
  definition: CommonStepDefinition<Input, Output, Config> &
    RunPlusPollMode<Input, Output, Config, State> & {
      onCancel?: OnCancelHandler<Input, Config>;
    }
): CommonStepDefinition<Input, Output, Config> &
  RunPlusPollMode<Input, Output, Config, State> & { onCancel?: OnCancelHandler<Input, Config> };
export function createServerStepDefinition<
  Input extends z.ZodType = z.ZodType,
  Output extends z.ZodType = z.ZodType,
  Config extends z.ZodObject = z.ZodObject,
  State = unknown
>(
  definition: CommonStepDefinition<Input, Output, Config> &
    PollOnlyMode<Input, Output, Config, State> & {
      onCancel?: OnCancelHandler<Input, Config>;
    }
): CommonStepDefinition<Input, Output, Config> &
  PollOnlyMode<Input, Output, Config, State> & { onCancel?: OnCancelHandler<Input, Config> };
export function createServerStepDefinition<
  Input extends z.ZodType = z.ZodType,
  Output extends z.ZodType = z.ZodType,
  Config extends z.ZodObject = z.ZodObject
>(
  definition: CommonStepDefinition<Input, Output, Config> &
    RunOnlyMode<Input, Output, Config> & {
      onCancel?: OnCancelHandler<Input, Config>;
    }
): CommonStepDefinition<Input, Output, Config> &
  RunOnlyMode<Input, Output, Config> & { onCancel?: OnCancelHandler<Input, Config> };
export function createServerStepDefinition(
  definition: ServerStepDefinition & { onCancel?: OnCancelHandler }
): ServerStepDefinition {
  validateStepDefinitionShape(definition);
  return applyPollDefaults(definition);
}

/**
 * Throws if the definition violates a structural invariant that the type
 * system cannot enforce against JS callers (the registry contract is
 * runtime-callable from non-TS plugins).
 */
export function validateStepDefinitionShape(definition: ServerStepDefinition): void {
  const { id, handler, run, poll } = definition;

  if (!handler && !run && !poll) {
    throw new Error(
      `Step "${id}" must define one of: "handler" (single-shot), "poll" (poll-only), or "run" together with "poll" (hand-off). None were provided.`
    );
  }

  if (handler && (run || poll)) {
    throw new Error(
      `Step "${id}" mixes the legacy "handler" field with "run" or "poll". Use one shape only.`
    );
  }

  if (run && !poll) {
    throw new Error(
      `Step "${id}" defines "run" without "poll". Single-shot steps must use "handler"; use "run" only together with "poll" for the hand-off lifecycle.`
    );
  }

  if (poll) {
    if (!poll.handler) {
      throw new Error(`Step "${id}" defines "poll" without a handler.`);
    }
    if (!poll.policy) {
      throw new Error(`Step "${id}" defines "poll" without a policy.`);
    }
    validatePollPolicy(id, poll.policy);
    if (poll.ceilings) {
      validatePollCeilings(id, poll.ceilings);
    }
  }
}

function validatePollPolicy(stepId: string, policy: PollPolicy): void {
  switch (policy.strategy) {
    case 'fixed':
      if (!Number.isFinite(policy.intervalMs) || policy.intervalMs <= 0) {
        throw new Error(
          `Step "${stepId}" has invalid poll policy: "fixed.intervalMs" must be a positive number.`
        );
      }
      break;
    case 'exponential':
      if (!Number.isFinite(policy.initialMs) || policy.initialMs <= 0) {
        throw new Error(
          `Step "${stepId}" has invalid poll policy: "exponential.initialMs" must be a positive number.`
        );
      }
      if (!Number.isFinite(policy.maxMs) || policy.maxMs < policy.initialMs) {
        throw new Error(
          `Step "${stepId}" has invalid poll policy: "exponential.maxMs" must be >= "initialMs".`
        );
      }
      if (
        policy.multiplier != null &&
        (!Number.isFinite(policy.multiplier) || policy.multiplier <= 1)
      ) {
        throw new Error(
          `Step "${stepId}" has invalid poll policy: "exponential.multiplier" must be > 1 when provided.`
        );
      }
      break;
    default:
      throw new Error(
        `Step "${stepId}" has invalid poll policy: unknown strategy "${
          (policy as { strategy: string }).strategy
        }".`
      );
  }
}

function validatePollCeilings(stepId: string, ceilings: PollCeilings): void {
  if (
    ceilings.maxAttempts != null &&
    (!Number.isFinite(ceilings.maxAttempts) || ceilings.maxAttempts < 1)
  ) {
    throw new Error(
      `Step "${stepId}" has invalid poll ceilings: "maxAttempts" must be >= 1 when provided.`
    );
  }
  if (
    ceilings.maxWaitMs != null &&
    (!Number.isFinite(ceilings.maxWaitMs) || ceilings.maxWaitMs <= 0)
  ) {
    throw new Error(
      `Step "${stepId}" has invalid poll ceilings: "maxWaitMs" must be > 0 when provided.`
    );
  }
}

/**
 * Returns a definition with default `poll.ceilings` filled in. The original
 * object is not mutated. The registry can detect that ceilings were defaulted
 * by checking whether the ceilings reference equals {@link DEFAULT_POLL_CEILINGS}.
 */
export function applyPollDefaults(definition: ServerStepDefinition): ServerStepDefinition {
  if (!definition.poll || definition.poll.ceilings) {
    return definition;
  }
  return {
    ...definition,
    poll: { ...definition.poll, ceilings: DEFAULT_POLL_CEILINGS },
  } as ServerStepDefinition;
}

/**
 * Returns true when the given definition uses the default ceilings object
 * (i.e. the author did not supply explicit ceilings and the defaults were
 * filled in by {@link createServerStepDefinition} or {@link applyPollDefaults}).
 */
export function pollCeilingsAreDefault(definition: ServerStepDefinition): boolean {
  return definition.poll?.ceilings === DEFAULT_POLL_CEILINGS;
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
export interface PollContext<TInput = z.ZodType, TConfig = z.ZodObject, TState = unknown>
  extends StepHandlerContext<TInput, TConfig> {
  /**
   * Author state persisted by the most recent run/poll invocation.
   * Undefined on the first poll of a poll-only step (no `run` to seed it).
   */
  state: TState | undefined;

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
