/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { encodeState } from './encode_state';
import { replaceUrlHashQuery, replaceUrlQuery } from './format';

/**
 * Common 'setStateToKbnUrl' without HashedItemStore support
 */
export function setStateToKbnUrl<State>(
  key: string,
  state: State,
  { useHash = false, storeInHashQuery = true }: { useHash: boolean; storeInHashQuery?: boolean } = {
    useHash: false,
    storeInHashQuery: true,
  },
  rawUrl: string
): string {
  const replacer = storeInHashQuery ? replaceUrlHashQuery : replaceUrlQuery;
  return replacer(rawUrl, (query) => {
    const encoded = encodeState(state, useHash);
    return {
      ...query,
      [key]: encoded,
    };
  });
}
