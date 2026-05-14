/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_POLL_CEILINGS } from '@kbn/workflows-extensions/server';
import type { PollCeilings, PollPolicy } from '@kbn/workflows-extensions/server';

/**
 * Engine bookkeeping persisted on the step execution state across resumes.
 * This is owned by the engine — author state lives separately under
 * `state.__authorState` (persisted by `CustomStepPollRunner` in
 * `server/step/custom_step_impl/custom_step_poll_runner.ts`).
 */
export interface PollBookkeeping {
  /** 1-based count of poll handler invocations performed so far. */
  attempt: number;
  /** Epoch ms when the step entered its poll loop (after `run`). */
  startedAt: number;
  /** Epoch ms of the most recent poll handler invocation. */
  lastInvocationAt: number;
  /** Epoch ms of the first scheduled poll wake-up. */
  firstPollAt?: number;
}

/**
 * Computes the delay (in ms) until the next poll wake-up, applying the
 * step's {@link PollPolicy}. Pure function — easy to unit test.
 *
 * @param policy        Author-declared cadence policy.
 * @param bookkeeping   Engine state from the previous invocation.
 * @param authorState   Persisted author state (may be undefined).
 * @param random        Optional random source (defaults to `Math.random`).
 *                      Injected so jitter is testable.
 */
export function computeNextDelayMs(
  policy: PollPolicy,
  bookkeeping: PollBookkeeping,
  authorState: unknown,
  random: () => number = Math.random
): number {
  switch (policy.strategy) {
    case 'fixed':
      return policy.intervalMs;
    case 'exponential': {
      const factor = policy.factor ?? 2;
      // attempt is 1-based: attempt=1 means "just finished the first poll, schedule the second".
      // For run-only steps that haven't yet polled, attempt is 0 → exponent 0 → initialMs.
      const exponent = Math.max(bookkeeping.attempt, 0);
      const raw = policy.initialMs * Math.pow(factor, exponent);
      const capped = Math.min(raw, policy.maxMs);
      return policy.jitter ? applyJitter(capped, random) : capped;
    }
    case 'dynamic':
      return policy.next({
        attempt: bookkeeping.attempt,
        startedAt: bookkeeping.startedAt,
        lastInvocationAt: bookkeeping.lastInvocationAt,
        state: authorState,
      });
    default:
      // Discriminated union exhaustiveness check
      throw new Error(
        `Unknown poll strategy "${(policy as { strategy: string }).strategy}". This is a bug.`
      );
  }
}

/**
 * Returns the next wake-up time as an absolute Date.
 */
export function computeNextPollAt(
  policy: PollPolicy,
  bookkeeping: PollBookkeeping,
  authorState: unknown,
  now: number = Date.now(),
  random: () => number = Math.random
): { nextPollAt: Date; delayMs: number } {
  const delayMs = Math.max(
    0,
    Math.floor(computeNextDelayMs(policy, bookkeeping, authorState, random))
  );
  return { nextPollAt: new Date(now + delayMs), delayMs };
}

/**
 * Multiplies a delay by a uniform random factor in `[0.5, 1.5]` to spread
 * concurrent waiters and avoid thundering herds. Documented exactly so step
 * authors can reason about the worst-case wake-up time.
 */
export function applyJitter(delayMs: number, random: () => number = Math.random): number {
  const factor = 0.5 + random();
  return Math.floor(delayMs * factor);
}

/**
 * Reason a poll-based step exhausted its engine-enforced ceiling.
 */
export type PollCeilingBreachReason = 'maxAttempts' | 'maxWaitMs';

export interface PollCeilingCheckOk {
  ok: true;
}

export interface PollCeilingCheckBreached {
  ok: false;
  reason: PollCeilingBreachReason;
  attempts: number;
  elapsedMs: number;
  maxAttempts: number;
  maxWaitMs: number;
}

export type PollCeilingCheck = PollCeilingCheckOk | PollCeilingCheckBreached;

/**
 * Decides whether the step may be put back to sleep for `plannedDelayMs`
 * given the engine ceilings. Run *before* scheduling so we never schedule a
 * doomed wake-up.
 */
export function enforceCeilings(
  ceilings: PollCeilings | undefined,
  bookkeeping: PollBookkeeping,
  plannedDelayMs: number,
  now: number = Date.now()
): PollCeilingCheck {
  const maxAttempts = ceilings?.maxAttempts ?? DEFAULT_POLL_CEILINGS.maxAttempts;
  const maxWaitMs = ceilings?.maxWaitMs ?? DEFAULT_POLL_CEILINGS.maxWaitMs;
  const elapsedMs = now - bookkeeping.startedAt;

  if (bookkeeping.attempt >= maxAttempts) {
    return {
      ok: false,
      reason: 'maxAttempts',
      attempts: bookkeeping.attempt,
      elapsedMs,
      maxAttempts,
      maxWaitMs,
    };
  }

  if (elapsedMs + plannedDelayMs > maxWaitMs) {
    return {
      ok: false,
      reason: 'maxWaitMs',
      attempts: bookkeeping.attempt,
      elapsedMs,
      maxAttempts,
      maxWaitMs,
    };
  }

  return { ok: true };
}
