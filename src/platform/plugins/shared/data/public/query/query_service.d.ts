/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart, IUiSettingsClient } from '@kbn/core/public';
import type { PersistableStateService, VersionedState } from '@kbn/kibana-utils-plugin/common';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import type { buildEsQuery } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { FilterManager } from './filter_manager';
import type { createAddToQueryLog } from './lib';
import type { TimefilterSetup } from './timefilter';
import type { createSavedQueryService } from './saved_query/saved_query_service';
import type { QueryState$ } from './state_sync/create_query_state_observable';
import type { QueryState } from './query_state';
import type { QueryStringContract } from './query_string';
import type { NowProviderInternalContract } from '../now_provider';
import type {
  extract,
  getAllMigrations,
  inject,
  telemetry,
} from '../../common/query/persistable_state';
interface QueryServiceSetupDependencies {
  storage: IStorageWrapper;
  uiSettings: IUiSettingsClient;
  nowProvider: NowProviderInternalContract;
  minRefreshInterval?: number;
}
interface QueryServiceStartDependencies {
  storage: IStorageWrapper;
  uiSettings: IUiSettingsClient;
  http: HttpStart;
}
export interface QuerySetup extends PersistableStateService<QueryState> {
  filterManager: FilterManager;
  timefilter: TimefilterSetup;
  queryString: QueryStringContract;
  state$: QueryState$;
  getState(): QueryState;
}
export interface QueryStart extends PersistableStateService<QueryState> {
  filterManager: FilterManager;
  timefilter: TimefilterSetup;
  queryString: QueryStringContract;
  state$: QueryState$;
  getState(): QueryState;
  addToQueryLog: ReturnType<typeof createAddToQueryLog>;
  savedQueries: ReturnType<typeof createSavedQueryService>;
  getEsQuery(indexPattern: DataView, timeRange?: TimeRange): ReturnType<typeof buildEsQuery>;
}
/**
 * Query Service
 * @internal
 */
export declare class QueryService implements PersistableStateService<QueryState> {
  private minRefreshInterval;
  filterManager: FilterManager;
  timefilter: TimefilterSetup;
  queryStringManager: QueryStringContract;
  state$: QueryState$;
  constructor(minRefreshInterval?: number);
  setup({
    storage,
    uiSettings,
    nowProvider,
    minRefreshInterval,
  }: QueryServiceSetupDependencies): QuerySetup;
  start({ storage, uiSettings, http }: QueryServiceStartDependencies): QueryStart;
  stop(): void;
  private getQueryState;
  extract: typeof extract;
  inject: typeof inject;
  telemetry: typeof telemetry;
  getAllMigrations: typeof getAllMigrations;
  migrateToLatest: (versionedState: VersionedState) => {
    time?: import('../../common').TimeRange;
    refreshInterval?: import('@kbn/data-service-server').RefreshInterval;
    query?: import('@kbn/es-query').Query | import('@kbn/es-query').AggregateQuery;
    filters: import('@kbn/es-query').Filter[];
  };
  private getPersistableStateMethods;
}
export {};
