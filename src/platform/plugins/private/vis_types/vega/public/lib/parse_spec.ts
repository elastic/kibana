/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'hjson';
import type { VegaSpec } from '../data_model/types';

const specCache = new Map<string, VegaSpec | null>();

/**
 * Parses a Vega/Vega-Lite hjson spec, memoized by the raw spec string.
 * `getUsedIndexPattern`, `getProjectRoutingOverrides` and `usesEsql` are all
 * derived from the same spec string whenever a vis is created or updated, so
 * this avoids parsing the same spec repeatedly. Returns `null` if the spec
 * fails to parse.
 */
export function parseVegaSpec(spec: string): VegaSpec | null {
  if (!specCache.has(spec)) {
    try {
      specCache.set(spec, parse(spec, { legacyRoot: false, keepWsc: true }) as VegaSpec);
    } catch (e) {
      specCache.set(spec, null);
    }
  }

  return specCache.get(spec) ?? null;
}
