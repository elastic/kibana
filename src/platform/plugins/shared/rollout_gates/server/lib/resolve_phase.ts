/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BuildIdentity } from './build_comparator';
import { compareBuilds } from './build_comparator';

export type { BuildIdentity } from './build_comparator';

export type RolloutPhase = 'staged' | 'finalized';

export interface ResolvePhaseParams {
  /** `packageInfo.buildFlavor === 'serverless'`. */
  isServerless: boolean;
  /** `packageInfo.dist`, or the `rolloutGates.dev.buildNum` override is set. */
  isRealBuild: boolean;
  currentBuild: BuildIdentity;
  /** The oldest build recorded for this gate in this project's ledger. */
  introducingBuild: BuildIdentity;
  /** The oldest build this project's ledger has ever seen, for any gate. */
  genesisBuild: BuildIdentity;
}

/**
 * Decides whether a rollout gate is `staged` (this is the first build to ship it: keep
 * existing usages running, but do not let users create new ones) or `finalized` (an earlier
 * build shipped it too, so rolling back one build is safe).
 *
 * Outside Serverless, or when not running a real build (no `buildNum`/`buildSha` to compare),
 * every gate is `finalized` immediately — there is no "next build" to wait for, so ECH and
 * on-prem deployments get the capability right away. `RolloutGatesService` short-circuits this
 * case before even touching Elasticsearch; this function treats it the same way so the two
 * stay in sync if that call site ever moves.
 *
 * The `genesisBuild` comparison exists so a brand-new project (or a test run against a fresh
 * Elasticsearch) does not see every pre-existing gate as `staged` just because it has never
 * recorded them before: anything introduced at or before the first build this project's
 * ledger has ever seen is treated as already finalized.
 */
export const resolvePhase = ({
  isServerless,
  isRealBuild,
  currentBuild,
  introducingBuild,
  genesisBuild,
}: ResolvePhaseParams): RolloutPhase => {
  if (!isServerless || !isRealBuild) {
    return 'finalized';
  }

  const introducedAtOrBeforeGenesis = compareBuilds(introducingBuild, genesisBuild) <= 0;
  if (introducedAtOrBeforeGenesis) {
    return 'finalized';
  }

  const currentIsNewerThanIntroducing = compareBuilds(currentBuild, introducingBuild) > 0;
  return currentIsNewerThanIntroducing ? 'finalized' : 'staged';
};
