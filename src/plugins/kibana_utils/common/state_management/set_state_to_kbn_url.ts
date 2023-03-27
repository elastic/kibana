/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { encodeState } from './encode_state';
import { replaceUrlHashQuery, replaceUrlQuery } from './format';
import { createStateHash } from './state_hash';

export type SetStateToKbnUrlHashOptions = { useHash: boolean; storeInHashQuery?: boolean };

export function createSetStateToKbnUrl(createHash: <State>(rawState: State) => string) {
  return <State>(
    key: string,
    state: State,
    { useHash = false, storeInHashQuery = true }: SetStateToKbnUrlHashOptions = {
      useHash: false,
      storeInHashQuery: true,
    },
    rawUrl: string
  ): string => {
    const replacer = storeInHashQuery ? replaceUrlHashQuery : replaceUrlQuery;
    return replacer(rawUrl, (query) => {
      const encoded = encodeState(state, useHash, createHash);
      return {
        ...query,
        [key]: encoded,
      };
    });
  };
}

const internalSetStateToKbnUrl = createSetStateToKbnUrl(<State>(rawState: State) =>
  createStateHash(JSON.stringify(rawState))
);

/**
 * Common version of setStateToKbnUrl which doesn't use session storage.
 *
 * Sets state to the url by key and returns a new url string.
 *
 * e.g.:
 * given a url: http://localhost:5601/oxf/app/kibana#/yourApp?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')
 * key: '_a'
 * and state: {tab: 'other'}
 *
 * will return url:
 * http://localhost:5601/oxf/app/kibana#/yourApp?_a=(tab:other)&_b=(f:test,i:'',l:'')
 *
 * By default due to Kibana legacy reasons assumed that state is stored in a query inside a hash part of the URL:
 * http://localhost:5601/oxf/app/kibana#/yourApp?_a={STATE}
 *
 * { storeInHashQuery: true } option should be used in you want to store you state in a main query (not in a hash):
 * http://localhost:5601/oxf/app/kibana?_a={STATE}#/yourApp
 */
export function setStateToKbnUrl<State>(
  key: string,
  state: State,
  hashOptions: SetStateToKbnUrlHashOptions,
  rawUrl: string
): string {
  return internalSetStateToKbnUrl(key, state, hashOptions, rawUrl);
}
