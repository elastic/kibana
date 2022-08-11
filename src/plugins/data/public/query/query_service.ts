/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { share } from 'rxjs/operators';
import { HttpStart, IUiSettingsClient } from '@kbn/core/public';
import { PersistableStateService, VersionedState } from '@kbn/kibana-utils-plugin/common';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { buildEsQuery, TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import { FilterManager } from './filter_manager';
import { createAddToQueryLog } from './lib';
import type { TimefilterSetup } from './timefilter';
import { TimefilterService } from './timefilter';
import { createSavedQueryService } from './saved_query/saved_query_service';
import {
  createQueryStateObservable,
  QueryState$,
} from './state_sync/create_query_state_observable';
import { getQueryState, QueryState } from './query_state';
import type { QueryStringContract } from './query_string';
import { QueryStringManager } from './query_string';
import { getEsQueryConfig } from '../../common';
import { getUiSettings } from '../services';
import { NowProviderInternalContract } from '../now_provider';
import {
  extract,
  getAllMigrations,
  inject,
  migrateToLatest,
  telemetry,
} from '../../common/query/persistable_state';

interface QueryServiceSetupDependencies {
  storage: IStorageWrapper;
  uiSettings: IUiSettingsClient;
  nowProvider: NowProviderInternalContract;
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

  // TODO: type explicitly
  addToQueryLog: ReturnType<typeof createAddToQueryLog>;
  // TODO: type explicitly
  savedQueries: ReturnType<typeof createSavedQueryService>;
  // TODO: type explicitly
  getEsQuery(indexPattern: DataView, timeRange?: TimeRange): ReturnType<typeof buildEsQuery>;
}

/**
 * Query Service
 * @internal
 */
export class QueryService implements PersistableStateService<QueryState> {
  filterManager!: FilterManager;
  timefilter!: TimefilterSetup;
  queryStringManager!: QueryStringContract;

  state$!: QueryState$;

  public setup({ storage, uiSettings, nowProvider }: QueryServiceSetupDependencies): QuerySetup {
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
      getState: () => this.getQueryState(),
      ...this.getPersistableStateMethods(),
    };
  }

  public start({ storage, uiSettings, http }: QueryServiceStartDependencies): QueryStart {
    return {
      addToQueryLog: createAddToQueryLog({
        storage,
        uiSettings,
      }),
      filterManager: this.filterManager,
      queryString: this.queryStringManager,
      savedQueries: createSavedQueryService(http),
      state$: this.state$,
      getState: () => this.getQueryState(),
      timefilter: this.timefilter,
      getEsQuery: (indexPattern: DataView, timeRange?: TimeRange) => {
        const timeFilter = this.timefilter.timefilter.createFilter(indexPattern, timeRange);

        return buildEsQuery(
          indexPattern,
          this.queryStringManager.getQuery(),
          [...this.filterManager.getFilters(), ...(timeFilter ? [timeFilter] : [])],
          getEsQueryConfig(getUiSettings())
        );
      },
      ...this.getPersistableStateMethods(),
    };
  }

  public stop() {
    // nothing to do here yet
  }

  private getQueryState() {
    return getQueryState({
      timefilter: this.timefilter,
      queryString: this.queryStringManager,
      filterManager: this.filterManager,
    });
  }

  public extract = extract;

  public inject = inject;

  public telemetry = telemetry;

  public getAllMigrations = getAllMigrations;

  public migrateToLatest = (versionedState: VersionedState) => {
    // Argument of type 'VersionedState<Serializable>' is not assignable to parameter of type 'VersionedState<QueryState>'.
    return migrateToLatest(versionedState as VersionedState<QueryState>);
  };

  private getPersistableStateMethods(): PersistableStateService<QueryState> {
    return {
      extract: this.extract.bind(this),
      inject: this.inject.bind(this),
      telemetry: this.telemetry.bind(this),
      migrateToLatest: this.migrateToLatest.bind(this),
      getAllMigrations: this.getAllMigrations.bind(this),
    };
  }
}
