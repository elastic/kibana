/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { UrlGeneratorsDefinition } from '../../share/public';
import type { TimeRange, Filter, Query, QueryState, RefreshInterval } from '../../data/public';
import { esFilters } from '../../data/public';
import { setStateToKbnUrl } from '../../kibana_utils/public';

export const DISCOVER_APP_URL_GENERATOR = 'DISCOVER_APP_URL_GENERATOR';

export interface DiscoverUrlGeneratorState {
  /**
   * Optionally set saved search ID.
   */
  savedSearchId?: string;

  /**
   * Optionally set index pattern ID.
   */
  indexPatternId?: string;

  /**
   * Optionally set the time range in the time picker.
   */
  timeRange?: TimeRange;

  /**
   * Optionally set the refresh interval.
   */
  refreshInterval?: RefreshInterval;

  /**
   * Optionally apply filters.
   */
  filters?: Filter[];

  /**
   * Optionally set a query. NOTE: if given and used in conjunction with `dashboardId`, and the
   * saved dashboard has a query saved with it, this will _replace_ that query.
   */
  query?: Query;

  /**
   * If not given, will use the uiSettings configuration for `storeInSessionStorage`. useHash determines
   * whether to hash the data in the url to avoid url length issues.
   */
  useHash?: boolean;

  /**
   * Background search session id
   */
  searchSessionId?: string;

  /**
   * Columns displayed in the table
   */
  columns?: string[];

  /**
   * Used interval of the histogram
   */
  interval?: string;

  /**
   * Array of the used sorting [[field,direction],...]
   */
  sort?: string[][];

  /**
   * id of the used saved query
   */
  savedQuery?: string;
}

interface Params {
  appBasePath: string;
  useHash: boolean;
}

export const SEARCH_SESSION_ID_QUERY_PARAM = 'searchSessionId';

export class DiscoverUrlGenerator
  implements UrlGeneratorsDefinition<typeof DISCOVER_APP_URL_GENERATOR>
{
  constructor(private readonly params: Params) {}

  public readonly id = DISCOVER_APP_URL_GENERATOR;

  public readonly createUrl = async ({
    useHash = this.params.useHash,
    filters,
    indexPatternId,
    query,
    refreshInterval,
    savedSearchId,
    timeRange,
    searchSessionId,
    columns,
    savedQuery,
    sort,
    interval,
  }: DiscoverUrlGeneratorState): Promise<string> => {
    const savedSearchPath = savedSearchId ? `view/${encodeURIComponent(savedSearchId)}` : '';
    const appState: {
      query?: Query;
      filters?: Filter[];
      index?: string;
      columns?: string[];
      interval?: string;
      sort?: string[][];
      savedQuery?: string;
    } = {};
    const queryState: QueryState = {};

    if (query) appState.query = query;
    if (filters && filters.length)
      appState.filters = filters?.filter((f) => !esFilters.isFilterPinned(f));
    if (indexPatternId) appState.index = indexPatternId;
    if (columns) appState.columns = columns;
    if (savedQuery) appState.savedQuery = savedQuery;
    if (sort) appState.sort = sort;
    if (interval) appState.interval = interval;

    if (timeRange) queryState.time = timeRange;
    if (filters && filters.length)
      queryState.filters = filters?.filter((f) => esFilters.isFilterPinned(f));
    if (refreshInterval) queryState.refreshInterval = refreshInterval;

    let url = `${this.params.appBasePath}#/${savedSearchPath}`;
    url = setStateToKbnUrl<QueryState>('_g', queryState, { useHash }, url);
    url = setStateToKbnUrl('_a', appState, { useHash }, url);

    if (searchSessionId) {
      url = `${url}&${SEARCH_SESSION_ID_QUERY_PARAM}=${searchSessionId}`;
    }

    return url;
  };
}
