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

export const assertActive = (
  fiber: Fiber,
  capturedError: unknown,
  pluginName: string,
  phase: 'setup' | 'start'
): void => {
  // Cast to number because fiber.state is typed as cordis's own FiberState const enum,
  // which is a different nominal type from our re-declared @kbn/cordis FiberState.
  const state = fiber.state as number;

  if (state === FiberState.ACTIVE) return;
  if (capturedError !== undefined) throw capturedError;
  const detail =
    state === FiberState.PENDING
      ? 'inject keys are not resolved — check that required dependencies are enabled and export browser code'
      : `unexpected fiber state "${state}"`;
  throw new Error(
    `Cordis fiber for plugin "${pluginName}" (${phase}) did not become ACTIVE: ${detail}.`
  );
};
