/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TimeRange, Filter, Query, esFilters } from '../../../../src/plugins/data/public';
import { getStatesFromKbnUrl, setStateToKbnUrl } from '../../../../src/plugins/kibana_utils/public';
import { UrlGeneratorsDefinition } from '../../../../src/plugins/share/public';

export const STATE_STORAGE_KEY = '_a';
export const GLOBAL_STATE_STORAGE_KEY = '_g';

export const SEARCH_SESSIONS_EXAMPLES_APP_URL_GENERATOR =
  'SEARCH_SESSIONS_EXAMPLES_APP_URL_GENERATOR';

export interface AppUrlState {
  filters?: Filter[];
  query?: Query;
  indexPatternId?: string;
  numericFieldName?: string;
  searchSessionId?: string;
}

export interface GlobalUrlState {
  filters?: Filter[];
  time?: TimeRange;
}

export type SearchSessionExamplesUrlGeneratorState = AppUrlState & GlobalUrlState;

export const createSearchSessionsExampleUrlGenerator = (
  getStartServices: () => Promise<{
    appBasePath: string;
  }>
): UrlGeneratorsDefinition<typeof SEARCH_SESSIONS_EXAMPLES_APP_URL_GENERATOR> => ({
  id: SEARCH_SESSIONS_EXAMPLES_APP_URL_GENERATOR,
  createUrl: async (state: SearchSessionExamplesUrlGeneratorState) => {
    const startServices = await getStartServices();
    const appBasePath = startServices.appBasePath;
    const path = `${appBasePath}/app/searchExamples/search-sessions`;

    let url = setStateToKbnUrl<AppUrlState>(
      STATE_STORAGE_KEY,
      {
        query: state.query,
        filters: state.filters?.filter((f) => !esFilters.isFilterPinned(f)),
        indexPatternId: state.indexPatternId,
        numericFieldName: state.numericFieldName,
        searchSessionId: state.searchSessionId,
      } as AppUrlState,
      { useHash: false, storeInHashQuery: false },
      path
    );

    url = setStateToKbnUrl<GlobalUrlState>(
      GLOBAL_STATE_STORAGE_KEY,
      {
        time: state.time,
        filters: state.filters?.filter((f) => esFilters.isFilterPinned(f)),
      } as GlobalUrlState,
      { useHash: false, storeInHashQuery: false },
      url
    );

    return url;
  },
});

export function getInitialStateFromUrl(): SearchSessionExamplesUrlGeneratorState {
  const {
    _a: { numericFieldName, indexPatternId, searchSessionId, filters: aFilters, query } = {},
    _g: { filters: gFilters, time } = {},
  } = getStatesFromKbnUrl<{ _a: AppUrlState; _g: GlobalUrlState }>(
    window.location.href,
    ['_a', '_g'],
    {
      getFromHashQuery: false,
    }
  );

  return {
    numericFieldName,
    searchSessionId,
    time,
    filters: [...(gFilters ?? []), ...(aFilters ?? [])],
    indexPatternId,
    query,
  };
}
