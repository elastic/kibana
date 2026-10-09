/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BreakingChange } from '../diff';
import type { OpenAPISpec } from '../input/load_oas';
import { parseXState, type ParseXStateResult } from './parse_x_state';

type PathItem = Record<string, { 'x-state'?: string } | undefined>;

// OpenAPI operation keys on a path item. Everything else (parameters, summary,
// $ref, x-* extensions) is not an operation and carries no tier.
const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;

// Lower rank = more conservative. A whole-path removal spans every operation on
// the path, so it inherits the most conservative tier present.
const TIER_RANK: Readonly<Record<ParseXStateResult['tier'], number>> = {
  stable: 0,
  tech_preview: 1,
  experimental: 2,
};

const readXState = (pathItem: PathItem, method: string): string | undefined =>
  pathItem[method]?.['x-state'];

/**
 * Resolve the stability tier of a breaking change from the `x-state` of its
 * operation in the base spec (the API as it existed before the break). Base is
 * the correct source because a removed operation only exists there.
 *
 * A whole-path removal has no method and breaks every operation on the path, so
 * it takes the most conservative tier present (stable > tech_preview >
 * experimental). A missing path/method or absent `x-state` falls through
 * `parseXState` to `stable`, the conservative default.
 */
export const resolveTier = (baseOas: OpenAPISpec, change: BreakingChange): ParseXStateResult => {
  const pathItem = (baseOas.paths as Record<string, PathItem> | undefined)?.[change.path];
  if (!pathItem) {
    return parseXState(undefined);
  }

  if (change.method) {
    return parseXState(readXState(pathItem, change.method.toLowerCase()));
  }

  let mostConservative: ParseXStateResult | undefined;
  for (const method of HTTP_METHODS) {
    if (!(method in pathItem)) {
      continue;
    }
    const result = parseXState(readXState(pathItem, method));
    if (!mostConservative || TIER_RANK[result.tier] < TIER_RANK[mostConservative.tier]) {
      mostConservative = result;
    }
  }

  return mostConservative ?? parseXState(undefined);
};
