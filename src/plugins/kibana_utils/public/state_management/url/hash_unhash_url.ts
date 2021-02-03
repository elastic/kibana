/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { expandedStateToHashedState, hashedStateToExpandedState } from '../state_encoder';
import { replaceUrlHashQuery } from './format';

export type IParsedUrlQuery = Record<string, any>;

interface IUrlQueryMapperOptions {
  hashableParams: string[];
}
export type IUrlQueryReplacerOptions = IUrlQueryMapperOptions;

export const unhashQuery = createQueryMapper(hashedStateToExpandedState);
export const hashQuery = createQueryMapper(expandedStateToHashedState);

export const unhashUrl = createQueryReplacer(unhashQuery);
export const hashUrl = createQueryReplacer(hashQuery);

// naive hack, but this allows to decouple these utils from AppState, GlobalState for now
// when removing AppState, GlobalState and migrating to IState containers,
// need to make sure that apps explicitly passing this allow-list to hash
const __HACK_HARDCODED_LEGACY_HASHABLE_PARAMS = ['_g', '_a', '_s'];
function createQueryMapper(queryParamMapper: (q: string) => string | null) {
  return (
    query: IParsedUrlQuery,
    options: IUrlQueryMapperOptions = {
      hashableParams: __HACK_HARDCODED_LEGACY_HASHABLE_PARAMS,
    }
  ) =>
    Object.fromEntries(
      Object.entries(query || {}).map(([name, value]) => {
        if (!options.hashableParams.includes(name)) return [name, value];
        return [name, queryParamMapper(value) || value];
      })
    );
}

function createQueryReplacer(
  queryMapper: (q: IParsedUrlQuery, options?: IUrlQueryMapperOptions) => IParsedUrlQuery,
  options?: IUrlQueryReplacerOptions
) {
  return (url: string) => replaceUrlHashQuery(url, (query) => queryMapper(query, options));
}
