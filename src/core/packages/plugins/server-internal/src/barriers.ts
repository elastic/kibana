/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Fiber } from '@kbn/cordis';
import { FiberState } from '@kbn/cordis';

/**
 * Asserts that a fiber reached ACTIVE state after being awaited.
 *
 * CRITICAL: Fiber.await() resolves immediately when inject is unsatisfied
 * (fiber stays PENDING, inertia === undefined).  Without this guard a missing
 * dependency silently produces a non-functional plugin with no error.
 *
 * If the fiber is FAILED (apply() threw), re-throws the original error so the
 * caller gets the real stack trace rather than a generic state-mismatch message.
 *
 * Call after every `await ctx.plugin(...)` in the Cordis driver.
 */
export const assertActive = (
  fiber: Fiber,
  capturedError: unknown,
  pluginName: string,
  phase: 'setup' | 'start'
): void => {
  if (fiber.state === FiberState.ACTIVE) return;

  // FAILED: apply() threw — re-surface the original error.
  if (capturedError !== undefined) {
    throw capturedError;
  }

  // PENDING: inject not yet satisfied.
  const detail =
    fiber.state === FiberState.PENDING
      ? 'inject keys are not resolved — check that required dependencies are enabled and export server code'
      : `unexpected fiber state "${fiber.state}"`;
  throw new Error(
    `Cordis fiber for plugin "${pluginName}" (${phase}) did not become ACTIVE: ${detail}.`
  );
};
