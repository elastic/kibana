/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Raw step fields the node reads to surface retry / continue-on-failure posture. */
export interface StepFailureConfig {
  readonly retry?: { readonly 'max-attempts'?: number; readonly delay?: string };
  readonly 'on-failure'?: {
    readonly retry?: { readonly 'max-attempts'?: number; readonly delay?: string };
    readonly continue?: boolean;
    readonly fallback?: readonly unknown[];
  };
}

/**
 * Extract the configured `retry.max-attempts` for a step, looking at both
 * the step-level `retry` shortcut and the canonical `on-failure.retry` block.
 * Returns `undefined` when retry isn't configured.
 */
export function getStepMaxAttempts(step: StepFailureConfig | undefined): number | undefined {
  const fromDirect = step?.retry?.['max-attempts'];
  const fromOnFailure = step?.['on-failure']?.retry?.['max-attempts'];
  const value = fromDirect ?? fromOnFailure;
  return typeof value === 'number' && value > 0 ? value : undefined;
}

/** Retry delay string when retry is configured; defaults to `5s` for tooltips. */
export function getStepRetryDelay(step: StepFailureConfig | undefined): string | undefined {
  if (getStepMaxAttempts(step) == null) return undefined;
  const fromDirect = step?.retry?.delay;
  const fromOnFailure = step?.['on-failure']?.retry?.delay;
  const value = fromDirect ?? fromOnFailure;
  return typeof value === 'string' && value.length > 0 ? value : '5s';
}

/** True when `on-failure.continue` is enabled. */
export function getStepContinuesOnFailure(step: StepFailureConfig | undefined): boolean {
  return step?.['on-failure']?.continue === true;
}

/** True when `on-failure.fallback` has at least one step (graph error route). */
export function getStepHasFallback(step: StepFailureConfig | undefined): boolean {
  const fallback = step?.['on-failure']?.fallback;
  return Array.isArray(fallback) && fallback.length > 0;
}
