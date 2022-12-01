/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import rison, { RisonValue } from '@kbn/rison';
import { createStateHash } from './state_hash';

/**
 * Common 'encodeState' without HashedItemStore support
 */
export function encodeState<State>(state: State, useHash: boolean): string {
  if (useHash) {
    return createStateHash(JSON.stringify(state));
  } else {
    return rison.encode(state as unknown as RisonValue);
  }
}
