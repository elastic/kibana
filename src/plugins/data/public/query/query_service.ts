/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { buildEsQuery } from '@kbn/es-query';
import { share } from 'rxjs/operators';
import type { SavedObjectsClientContract } from '../../../../core/public/saved_objects/saved_objects_client';
import type { IUiSettingsClient } from '../../../../core/public/ui_settings/types';
import type { IStorageWrapper } from '../../../kibana_utils/public/storage/types';
import { getEsQueryConfig } from '../../common/es_query/get_es_query_config';
import { IndexPattern } from '../../common/index_patterns/index_patterns/index_pattern';
import type { TimeRange } from '../../common/query/timefilter/types';
import type { NowProviderInternalContract } from '../now_provider/now_provider';
import { getUiSettings } from '../services';
import { FilterManager } from './filter_manager/filter_manager';
import { createAddToQueryLog } from './lib/add_to_query_log';
import type { QueryStringContract } from './query_string/query_string_manager';
import { QueryStringManager } from './query_string/query_string_manager';
import { createSavedQueryService } from './saved_query/saved_query_service';
import { createQueryStateObservable } from './state_sync/create_global_query_observable';
import type { TimefilterSetup } from './timefilter/timefilter_service';
import { TimefilterService } from './timefilter/timefilter_service';

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
      getEsQuery: (indexPattern: IndexPattern, timeRange?: TimeRange) => {
        const timeFilter = this.timefilter.timefilter.createFilter(indexPattern, timeRange);

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
