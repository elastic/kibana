/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Sha256 } from '@kbn/crypto-browser';
import { stableStringify } from '@kbn/std';

/** Request kind used to match a replayed request when the exact key differs. */
export type ReplayKind = 'esql' | 'aggs' | 'hits';

/**
 * Creates a stable key for a search request's params so a recorded response can be replayed.
 * Ignores `preference` and `sessionId`, like the client-side request cache hash.
 */
export const createReplayKey = (params: object | undefined): string => {
  const { preference, sessionId, ...rest } = (params ?? {}) as Record<string, unknown>;
  return new Sha256().update(stableStringify(rest), 'utf8').digest('hex');
};

/**
 * Classifies request params (interceptor side) or a recorded request body (inspector side).
 */
export const getReplayKind = (paramsOrBody: object | undefined): ReplayKind => {
  const { query, body, aggs } = (paramsOrBody ?? {}) as Record<string, unknown>;
  if (typeof query === 'string') {
    return 'esql';
  }
  const dsl = (body ?? paramsOrBody ?? {}) as Record<string, unknown>;
  return dsl.aggs || aggs ? 'aggs' : 'hits';
};
