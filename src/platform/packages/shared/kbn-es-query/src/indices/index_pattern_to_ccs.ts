/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { castArray } from 'lodash';

function isCrossCluster(pattern: string): boolean {
  if (pattern.startsWith('*:')) return true; // already wildcard cluster

  // simple, cheap heuristic first
  if (!pattern.includes(':')) {
    return false;
  }

  // match on single `:`, but exclude `::` which is used for e.g. `::failure`
  return /(?<!:):(?!:)/.test(pattern);
}

/**
 * Appends cross-cluster search equivalents for each specified index pattern.
 * Use this when you want to query both local and cross-cluster indices automatically.
 */
export function indexPatternToCcs(index: string | string[]) {
  // split on commas, normalise whitespace, and drop empty indices
  const indices = castArray(index)
    .flatMap((idx) => idx.split(','))
    .map((i) => i.trim())
    .filter(Boolean);

  const expanded = new Set<string>();
  for (const idx of indices) {
    expanded.add(idx);
    if (!isCrossCluster(idx)) {
      expanded.add(`*:${idx}`);
    }
  }

  return Array.from(expanded);
}
