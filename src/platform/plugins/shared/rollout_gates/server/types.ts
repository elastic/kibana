/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { RolloutPhase } from './lib/resolve_phase';
import type { RolloutPhase } from './lib/resolve_phase';

export interface RolloutGatesSetup {
  /**
   * Declares a rollout gate id during setup. Every id a plugin will ever ask about via
   * `getPhase`/`isFinalized` must be declared here first; `getPhase` throws for an
   * undeclared id. Declaring the same id more than once, including from a different plugin,
   * is safe and a no-op after the first call.
   */
  declare(gateId: string): void;
}

export interface RolloutGatesStart {
  /**
   * Resolves once this build's phase for `gateId` is known.
   *
   * `staged` means this is the first build in this project to ship `gateId` — keep running
   * whatever already exists, but do not let users create new ones yet. `finalized` means an
   * earlier build already shipped it, so rolling this project back one build is safe.
   *
   * The service only reports the phase; each consumer decides what, if anything, to block
   * while a gate is `staged`.
   *
   * Throws synchronously if `gateId` was never `declare`d during setup.
   */
  getPhase(gateId: string): Promise<RolloutPhase>;
  /** Convenience for `(await getPhase(gateId)) === 'finalized'`. */
  isFinalized(gateId: string): Promise<boolean>;
}
