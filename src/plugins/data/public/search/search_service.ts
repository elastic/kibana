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

<<<<<<< HEAD
import { NextObserver } from 'rxjs';
import { Plugin, CoreSetup, CoreStart, PackageInfo } from '../../../../core/public';
import { SYNC_SEARCH_STRATEGY, syncSearchStrategyProvider } from './sync_search_strategy';
import { ISearchSetup, ISearchStart, TSearchStrategiesMap, ISearchStrategy } from './types';
import { ExpressionsSetup } from '../../../../plugins/expressions/public';

import { createSearchSource, SearchSource, SearchSourceDependencies } from './search_source';
import { TStrategyTypes } from './strategy_types';
import { getEsClient, LegacyApiCaller } from './legacy';
import { ES_SEARCH_STRATEGY, DEFAULT_SEARCH_STRATEGY } from '../../common/search';
import { esSearchStrategyProvider } from './es_search';
import { IndexPatternsContract } from '../index_patterns/index_patterns';
import { QuerySetup } from '../query';
import { GetInternalStartServicesFn } from '../types';
import { SearchInterceptor, SearchEventInfo } from './search_interceptor';
import {
  getAggTypes,
  getAggTypesFunctions,
  AggTypesRegistry,
  AggConfigs,
  getCalculateAutoTimeExpression,
} from './aggs';
import { FieldFormatsStart } from '../field_formats';
import { ISearchGeneric } from './i_search';
import { SessionService } from './session_service';

interface SearchServiceSetupDependencies {
=======
import {
  Plugin,
  CoreSetup,
  CoreStart,
  PluginInitializerContext,
  StartServicesAccessor,
} from 'src/core/public';
import { BehaviorSubject } from 'rxjs';
import { BfetchPublicSetup } from 'src/plugins/bfetch/public';
import { ISearchSetup, ISearchStart, SearchEnhancements } from './types';

import { handleResponse } from './fetch';
import {
  kibana,
  kibanaContext,
  kibanaContextFunction,
  ISearchGeneric,
  SearchSourceDependencies,
  SearchSourceService,
} from '../../common/search';
import { getCallMsearch } from './legacy';
import { AggsService, AggsStartDependencies } from './aggs';
import { IndexPatternsContract } from '../index_patterns/index_patterns';
import { ISearchInterceptor, SearchInterceptor } from './search_interceptor';
import { SearchUsageCollector, createUsageCollector } from './collectors';
import { UsageCollectionSetup } from '../../../usage_collection/public';
import { esdsl, esRawResponse, getEsaggs } from './expressions';
import { ExpressionsSetup } from '../../../expressions/public';
import { ISessionsClient, ISessionService, SessionsClient, SessionService } from './session';
import { ConfigSchema } from '../../config';
import {
  SHARD_DELAY_AGG_NAME,
  getShardDelayBucketAgg,
} from '../../common/search/aggs/buckets/shard_delay';
import { aggShardDelay } from '../../common/search/aggs/buckets/shard_delay_fn';
import { DataPublicPluginStart, DataStartDependencies } from '../types';

/** @internal */
export interface SearchServiceSetupDependencies {
  bfetch: BfetchPublicSetup;
>>>>>>> 058f28ab235a661cfa4b9168e97dd55026f54146
  expressions: ExpressionsSetup;
  usageCollection?: UsageCollectionSetup;
}

/** @internal */
export interface SearchServiceStartDependencies {
  fieldFormats: AggsStartDependencies['fieldFormats'];
  indexPatterns: IndexPatternsContract;
}

export class SearchService implements Plugin<ISearchSetup, ISearchStart> {
  private readonly aggsService = new AggsService();
  private readonly searchSourceService = new SearchSourceService();
  private searchInterceptor!: ISearchInterceptor;
  private usageCollector?: SearchUsageCollector;
  private sessionService!: ISessionService;
  private sessionsClient!: ISessionsClient;

  constructor(private initializerContext: PluginInitializerContext<ConfigSchema>) {}

  public setup(
    { http, getStartServices, notifications, uiSettings }: CoreSetup,
    { bfetch, expressions, usageCollection }: SearchServiceSetupDependencies
  ): ISearchSetup {
    this.usageCollector = createUsageCollector(getStartServices, usageCollection);

    this.sessionsClient = new SessionsClient({ http });
    this.sessionService = new SessionService(
      this.initializerContext,
      getStartServices,
      this.sessionsClient
    );
    /**
     * A global object that intercepts all searches and provides convenience methods for cancelling
     * all pending search requests, as well as getting the number of pending search requests.
     */
    this.searchInterceptor = new SearchInterceptor({
      bfetch,
      toasts: notifications.toasts,
      http,
      uiSettings,
      startServices: getStartServices(),
      usageCollector: this.usageCollector!,
      session: this.sessionService,
    });

    expressions.registerFunction(
      getEsaggs({ getStartServices } as {
        getStartServices: StartServicesAccessor<DataStartDependencies, DataPublicPluginStart>;
      })
    );
    expressions.registerFunction(kibana);
    expressions.registerFunction(kibanaContextFunction);
    expressions.registerType(kibanaContext);

    expressions.registerFunction(esdsl);
    expressions.registerType(esRawResponse);

    const aggs = this.aggsService.setup({
      registerFunction: expressions.registerFunction,
      uiSettings,
    });

    if (this.initializerContext.config.get().search.aggs.shardDelay.enabled) {
      aggs.types.registerBucket(SHARD_DELAY_AGG_NAME, getShardDelayBucketAgg);
      expressions.registerFunction(aggShardDelay);
    }

    return {
      aggs,
      usageCollector: this.usageCollector!,
      __enhance: (enhancements: SearchEnhancements) => {
        this.searchInterceptor = enhancements.searchInterceptor;
      },
      session: this.sessionService,
      sessionsClient: this.sessionsClient,
    };
  }

  public start(
    { application, http, notifications, uiSettings }: CoreStart,
    { fieldFormats, indexPatterns }: SearchServiceStartDependencies
  ): ISearchStart {
    const search = ((request, options) => {
      return this.searchInterceptor.search(request, options);
    }) as ISearchGeneric;

    const loadingCount$ = new BehaviorSubject(0);
    http.addLoadingCountSource(loadingCount$);

    const searchSourceDependencies: SearchSourceDependencies = {
      getConfig: uiSettings.get.bind(uiSettings),
      search,
      onResponse: handleResponse,
      legacy: {
        callMsearch: getCallMsearch({ http }),
        loadingCount$,
      },
    };

    const sessionService = new SessionService();

    return {
      aggs: this.aggsService.start({ fieldFormats, uiSettings, indexPatterns }),
      search,
<<<<<<< HEAD
      session: sessionService,
      searchSource: {
        create: createSearchSource(dependencies.indexPatterns, searchSourceDependencies),
        createEmpty: () => {
          return new SearchSource({}, searchSourceDependencies);
        },
      },
      setInterceptor: (searchInterceptor: SearchInterceptor) => {
        // TODO: should an interceptor have a destroy method?
        this.searchInterceptor = searchInterceptor;
      },
      subscribe: (handler: (e: SearchEventInfo) => void) => {
        return this.searchInterceptor?.getEvents$().subscribe({
          next(e) {
            handler(e);
          },
        });
      },
      __LEGACY: legacySearch,
=======
      showError: (e: Error) => {
        this.searchInterceptor.showError(e);
      },
      session: this.sessionService,
      sessionsClient: this.sessionsClient,
      searchSource: this.searchSourceService.start(indexPatterns, searchSourceDependencies),
>>>>>>> 058f28ab235a661cfa4b9168e97dd55026f54146
    };
  }

  public stop() {
    this.aggsService.stop();
    this.searchSourceService.stop();
  }
}
