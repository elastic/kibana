/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { getXState } from '@kbn/router-to-openapispec';
import type { StabilityTier } from './parse_x_state';

/**
 * The tiers whose breaking changes gate the build (fail the check and count
 * toward the non-zero exit). Experimental is excluded: it is reported for
 * visibility but never blocks. Derived from StabilityTier so a newly added tier
 * gates by default until it is explicitly excluded here.
 */
export type GatingTier = Exclude<StabilityTier, 'experimental'>;

/**
 * Compile-time drift guard. StabilityTier is a hand-maintained copy of the
 * `stability` enum the route contract accepts (route.ts -> getXState). The
 * exported constant below only type-checks when the two sets are identical, so if
 * that enum ever gains or loses a tier this file stops compiling, forcing
 * StabilityTier (and the gating/labeling logic keyed off it) to be revisited.
 * Runtime x-state parsing stays decoupled from getXState (hand-written specs
 * deviate); this only pins the set of valid values, not how strings are decoded.
 */
type GeneratorStability = NonNullable<NonNullable<Parameters<typeof getXState>[0]>['stability']>;
type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

export const stabilityTierMatchesGeneratorContract: Equals<StabilityTier, GeneratorStability> =
  true;

/** Narrow a tier to a gating tier: everything except experimental gates. */
export const isGatingTier = (tier: StabilityTier): tier is GatingTier => tier !== 'experimental';
