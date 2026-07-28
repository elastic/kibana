/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The stability tiers an API can declare. Mirrors the `stability` enum in the
 * platform route contract (route.ts) and the input to `getXState`; kept in sync
 * by the compile-time guard in ./tiers.
 */
export type StabilityTier = 'stable' | 'tech_preview' | 'experimental';

export interface ParseXStateResult {
  tier: StabilityTier;
  since?: string;
}

// `getXState` appends "; added in <version>" for a non-serverless route that has
// a `since`, and emits a bare "Added in <version>" when the stability label is
// empty. Both matchers are case-insensitive and whitespace-tolerant so the
// hand-written variants observed in the bundled specs ("; Added in", "added in")
// parse identically to the generated form. The version is captured verbatim.
const SINCE_WITH_LABEL = /;\s*added in\s+(.+)$/i;
const BARE_SINCE = /^added in\s+(.+)$/i;

/**
 * Parse an OpenAPI `x-state` string into a stability tier (and optional `since`).
 *
 * The stability label mirrors `getXState` in @kbn/router-to-openapispec
 * ("Generally available" / "Technical Preview" / "Experimental"), but the check
 * runs against the bundled OAS, which includes hand-written specs. Those deviate
 * only in casing and spacing of the same nomenclature (e.g. "Technical preview",
 * "added in 9.5.0"), never in mechanism, so labels are compared case-insensitively
 * rather than coupled to `getXState`'s exact output.
 *
 * Two tests guard the two sources, and they are complementary, not redundant: a
 * round-trip test asserts this parser decodes `getXState`'s output for every tier
 * (so generator drift fails loudly), and a data-driven test asserts it decodes the
 * real distinct `x-state` strings observed in the bundled specs (so hand-written
 * variance stays covered). Coupling classification to `getXState` would break the
 * hand-written half; hence the tolerant parser.
 *
 * Unrecognized, empty, or missing input is treated as `stable` (the most
 * conservative tier and the platform default in route.ts), so an unknown state is
 * never under-classified into experimental where a breaking change would be
 * silently allowed.
 */
export const parseXState = (xState: string | undefined): ParseXStateResult => {
  if (!xState || !xState.trim()) {
    return { tier: 'stable' };
  }

  // A bare "Added in <version>" carries no stability label, so it is stable.
  const bareMatch = BARE_SINCE.exec(xState);
  if (bareMatch) {
    return { tier: 'stable', since: bareMatch[1].trim() };
  }

  let label = xState;
  let since: string | undefined;
  const sinceMatch = SINCE_WITH_LABEL.exec(xState);
  if (sinceMatch) {
    label = xState.slice(0, sinceMatch.index);
    since = sinceMatch[1].trim();
  }

  const normalized = label.trim().toLowerCase();
  let tier: StabilityTier = 'stable';
  if (normalized === 'technical preview') {
    tier = 'tech_preview';
  } else if (normalized === 'experimental') {
    tier = 'experimental';
  }

  return since !== undefined ? { tier, since } : { tier };
};
