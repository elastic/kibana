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

import { share } from 'rxjs/operators';
import { IUiSettingsClient, SavedObjectsClientContract } from 'src/core/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { FilterManager } from './filter_manager';
import { createAddToQueryLog } from './lib';
import { TimefilterService, TimefilterSetup } from './timefilter';
import { createSavedQueryService } from './saved_query/saved_query_service';
import { createQueryStateObservable } from './state_sync/create_global_query_observable';
import { QueryStringManager, QueryStringContract } from './query_string';
import { buildEsQuery, getEsQueryConfig } from '../../common';
import { getUiSettings } from '../services';
import { NowProviderInternalContract } from '../now_provider';
import { IndexPattern } from '..';

/**
 * Query Service
 * @internal
 */

interface QueryServiceSetupDependencies {
  storage: IStorageWrapper;
  uiSettings: IUiSettingsClient;
  nowProvider: NowProviderInternalContract;
}

interface QueryServiceStartDependencies {
  savedObjectsClient: SavedObjectsClientContract;
  storage: IStorageWrapper;
  uiSettings: IUiSettingsClient;
}

export class QueryService {
  filterManager!: FilterManager;
  timefilter!: TimefilterSetup;
  queryStringManager!: QueryStringContract;

  state$!: ReturnType<typeof createQueryStateObservable>;

  public setup({ storage, uiSettings, nowProvider }: QueryServiceSetupDependencies) {
    this.filterManager = new FilterManager(uiSettings);

    const timefilterService = new TimefilterService(nowProvider);
    this.timefilter = timefilterService.setup({
      uiSettings,
      storage,
    });

    this.queryStringManager = new QueryStringManager(storage, uiSettings);

    this.state$ = createQueryStateObservable({
      filterManager: this.filterManager,
      timefilter: this.timefilter,
      queryString: this.queryStringManager,
    }).pipe(share());

    return {
      filterManager: this.filterManager,
      timefilter: this.timefilter,
      queryString: this.queryStringManager,
      state$: this.state$,
    };
  }

  public start({ savedObjectsClient, storage, uiSettings }: QueryServiceStartDependencies) {
    return {
      addToQueryLog: createAddToQueryLog({
        storage,
        uiSettings,
      }),
      filterManager: this.filterManager,
      queryString: this.queryStringManager,
      savedQueries: createSavedQueryService(savedObjectsClient),
      state$: this.state$,
      timefilter: this.timefilter,
      getEsQuery: (indexPattern: IndexPattern) => {
        const timeFilter = this.timefilter.timefilter.createFilter(indexPattern);

        return buildEsQuery(
          indexPattern,
          this.queryStringManager.getQuery(),
          [...this.filterManager.getFilters(), ...(timeFilter ? [timeFilter] : [])],
          getEsQueryConfig(getUiSettings())
        );
      },
    };
  }

  public stop() {
    // nothing to do here yet
  }
}

/** @public */
export type QuerySetup = ReturnType<QueryService['setup']>;
export type QueryStart = ReturnType<QueryService['start']>;
