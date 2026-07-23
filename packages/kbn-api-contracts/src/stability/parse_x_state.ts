/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

type XStateTier = 'stable' | 'tech_preview' | 'experimental';

export interface ParseXStateResult {
  tier: XStateTier;
  since?: string;
}

const SINCE_SEPARATOR = '; added in ';
const BARE_SINCE_PREFIX = 'Added in ';

/**
 * Parse an OpenAPI `x-state` string into a stability tier (and optional `since`).
 * Inverse of `getXState` in @kbn/router-to-openapispec (src/util.ts), which writes
 * these strings. Unrecognized, empty, or missing input is treated as `stable`
 * (most conservative), so an unknown state is never under-classified.
 */
export const parseXState = (xState: string | undefined): ParseXStateResult => {
  if (!xState) {
    return { tier: 'stable' };
  }

  if (xState.startsWith(BARE_SINCE_PREFIX)) {
    return { tier: 'stable', since: xState.slice(BARE_SINCE_PREFIX.length) };
  }

  let label = xState;
  let since: string | undefined;
  const separatorIdx = xState.indexOf(SINCE_SEPARATOR);
  if (separatorIdx !== -1) {
    label = xState.slice(0, separatorIdx);
    since = xState.slice(separatorIdx + SINCE_SEPARATOR.length);
  }

  let tier: XStateTier = 'stable';
  if (label === 'Technical Preview') {
    tier = 'tech_preview';
  } else if (label === 'Experimental') {
    tier = 'experimental';
  }

  return since !== undefined ? { tier, since } : { tier };
};
