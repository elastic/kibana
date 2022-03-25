/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializableRecord } from '@kbn/utility-types';
import { Filter, Query, isFilterPinned } from '@kbn/es-query';
import type { TimeRange } from '../../../../src/plugins/data/public';
import { getStatesFromKbnUrl, setStateToKbnUrl } from '../../../../src/plugins/kibana_utils/public';
import { LocatorDefinition } from '../../../../src/plugins/share/common';

export const STATE_STORAGE_KEY = '_a';
export const GLOBAL_STATE_STORAGE_KEY = '_g';

export const SEARCH_SESSIONS_EXAMPLES_APP_LOCATOR = 'SEARCH_SESSIONS_EXAMPLES_APP_LOCATOR';

export interface AppUrlState extends SerializableRecord {
  filters?: Filter[];
  query?: Query;
  dataViewId?: string;
  numericFieldName?: string;
  searchSessionId?: string;
}

export interface GlobalUrlState extends SerializableRecord {
  filters?: Filter[];
  time?: TimeRange;
}

export type SearchSessionsExamplesAppLocatorParams = AppUrlState & GlobalUrlState;

export class SearchSessionsExamplesAppLocatorDefinition
  implements LocatorDefinition<SearchSessionsExamplesAppLocatorParams>
{
  public readonly id = SEARCH_SESSIONS_EXAMPLES_APP_LOCATOR;

  constructor(protected readonly getAppBasePath: () => Promise<string>) {}

  public readonly getLocation = async (params: SearchSessionsExamplesAppLocatorParams) => {
    const appBasePath = await this.getAppBasePath();
    const path = `${appBasePath}/search-sessions`;

    let url = setStateToKbnUrl<AppUrlState>(
      STATE_STORAGE_KEY,
      {
        query: params.query,
        filters: params.filters?.filter((f) => !isFilterPinned(f)),
        dataViewId: params.dataViewId,
        numericFieldName: params.numericFieldName,
        searchSessionId: params.searchSessionId,
      } as AppUrlState,
      { useHash: false, storeInHashQuery: false },
      path
    );

    url = setStateToKbnUrl<GlobalUrlState>(
      GLOBAL_STATE_STORAGE_KEY,
      {
        time: params.time,
        filters: params.filters?.filter((f) => isFilterPinned(f)),
      } as GlobalUrlState,
      { useHash: false, storeInHashQuery: false },
      url
    );

    return {
      app: 'searchExamples',
      path: url,
      state: {},
    };
  };
}

export function getInitialStateFromUrl(): SearchSessionsExamplesAppLocatorParams {
  const {
    _a: { numericFieldName, dataViewId, searchSessionId, filters: aFilters, query } = {},
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
    dataViewId,
    query,
  };
}
