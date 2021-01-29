/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

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
import { NowProviderInternalContract } from '../now_provider';

/** @internal */
export interface SearchServiceSetupDependencies {
  bfetch: BfetchPublicSetup;
  expressions: ExpressionsSetup;
  usageCollection?: UsageCollectionSetup;
  nowProvider: NowProviderInternalContract;
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
    { bfetch, expressions, usageCollection, nowProvider }: SearchServiceSetupDependencies
  ): ISearchSetup {
    this.usageCollector = createUsageCollector(getStartServices, usageCollection);

    this.sessionsClient = new SessionsClient({ http });
    this.sessionService = new SessionService(
      this.initializerContext,
      getStartServices,
      this.sessionsClient,
      nowProvider
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
      nowProvider,
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

    return {
      aggs: this.aggsService.start({ fieldFormats, uiSettings, indexPatterns }),
      search,
      showError: (e: Error) => {
        this.searchInterceptor.showError(e);
      },
      session: this.sessionService,
      sessionsClient: this.sessionsClient,
      searchSource: this.searchSourceService.start(indexPatterns, searchSourceDependencies),
    };
  }

  public stop() {
    this.aggsService.stop();
    this.searchSourceService.stop();
  }
}
