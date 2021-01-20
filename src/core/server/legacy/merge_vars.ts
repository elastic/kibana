/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { LegacyVars } from './types';

const ELIGIBLE_FLAT_MERGE_KEYS = ['uiCapabilities'];

export function mergeVars(...sources: LegacyVars[]): LegacyVars {
  return Object.assign(
    {},
    ...sources,
    ...ELIGIBLE_FLAT_MERGE_KEYS.flatMap((key) =>
      sources.some((source) => key in source)
        ? [{ [key]: Object.assign({}, ...sources.map((source) => source[key] || {})) }]
        : []
    )
  );
}
