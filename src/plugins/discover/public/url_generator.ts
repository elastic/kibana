/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  TimeRange,
  Filter,
  Query,
  esFilters,
  QueryState,
  RefreshInterval,
} from '../../data/public';
import { setStateToKbnUrl } from '../../kibana_utils/public';
import { UrlGeneratorsDefinition } from '../../share/public';

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
   * Optionally apply filers.
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
}

interface Params {
  appBasePath: string;
  useHash: boolean;
}

export class DiscoverUrlGenerator
  implements UrlGeneratorsDefinition<typeof DISCOVER_APP_URL_GENERATOR> {
  constructor(private readonly params: Params) {}

  public readonly id = DISCOVER_APP_URL_GENERATOR;

  public readonly createUrl = async ({
    filters,
    indexPatternId,
    query,
    refreshInterval,
    savedSearchId,
    timeRange,
    useHash = this.params.useHash,
  }: DiscoverUrlGeneratorState): Promise<string> => {
    const savedSearchPath = savedSearchId ? encodeURIComponent(savedSearchId) : '';
    const appState: {
      query?: Query;
      filters?: Filter[];
      index?: string;
    } = {};
    const queryState: QueryState = {};

    if (query) appState.query = query;
    if (filters && filters.length)
      appState.filters = filters?.filter((f) => !esFilters.isFilterPinned(f));
    if (indexPatternId) appState.index = indexPatternId;

    if (timeRange) queryState.time = timeRange;
    if (filters && filters.length)
      queryState.filters = filters?.filter((f) => esFilters.isFilterPinned(f));
    if (refreshInterval) queryState.refreshInterval = refreshInterval;

    let url = `${this.params.appBasePath}#/${savedSearchPath}`;
    url = setStateToKbnUrl<QueryState>('_g', queryState, { useHash }, url);
    url = setStateToKbnUrl('_a', appState, { useHash }, url);

    return url;
  };
}
