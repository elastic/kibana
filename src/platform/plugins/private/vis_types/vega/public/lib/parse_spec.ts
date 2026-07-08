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

let lastSpecString: string | undefined;
let lastParsedSpec: VegaSpec | null = null;

/**
 * Parses a Vega/Vega-Lite hjson spec, memoizing only the most recently parsed
 * spec. `getUsedIndexPattern`, `getProjectRoutingOverrides` and `usesEsql` are
 * all derived from the same spec string whenever a vis is created or updated,
 * so a single-slot cache avoids re-parsing the same (potentially large) spec
 * three times in a row without accumulating every spec ever seen in memory.
 * Returns `null` if the spec fails to parse.
 */
export function parseVegaSpec(spec: string): VegaSpec | null {
  if (spec !== lastSpecString) {
    lastSpecString = spec;
    try {
      lastParsedSpec = parse(spec, { legacyRoot: false, keepWsc: true }) as VegaSpec;
    } catch (e) {
      lastParsedSpec = null;
    }
  }

  return lastParsedSpec;
}
