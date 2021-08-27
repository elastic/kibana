/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { BehaviorSubject } from 'rxjs';
import type { CoreSetup, CoreStart, StartServicesAccessor } from '../../../../core/public';
import type { Plugin } from '../../../../core/public/plugins/plugin';
import type { PluginInitializerContext } from '../../../../core/public/plugins/plugin_context';
import type { BfetchPublicSetup } from '../../../bfetch/public/plugin';
import type { ExpressionsSetup } from '../../../expressions/public/plugin';
import type { UsageCollectionSetup } from '../../../usage_collection/public/plugin';
import type { IndexPatternsContract } from '../../common/index_patterns/index_patterns/index_patterns';
import {
  getShardDelayBucketAgg,
  SHARD_DELAY_AGG_NAME,
} from '../../common/search/aggs/buckets/shard_delay';
import { aggShardDelay } from '../../common/search/aggs/buckets/shard_delay_fn';
import { cidrFunction } from '../../common/search/expressions/cidr';
import { dateRangeFunction } from '../../common/search/expressions/date_range';
import { esRawResponse } from '../../common/search/expressions/es_raw_response';
import { existsFilterFunction } from '../../common/search/expressions/exists_filter';
import { extendedBoundsFunction } from '../../common/search/expressions/extended_bounds';
import { fieldFunction } from '../../common/search/expressions/field';
import { geoBoundingBoxFunction } from '../../common/search/expressions/geo_bounding_box';
import { geoPointFunction } from '../../common/search/expressions/geo_point';
import { ipRangeFunction } from '../../common/search/expressions/ip_range';
import { kibana } from '../../common/search/expressions/kibana';
import { kibanaContext } from '../../common/search/expressions/kibana_context_type';
import { kibanaFilterFunction } from '../../common/search/expressions/kibana_filter';
import { kqlFunction } from '../../common/search/expressions/kql';
import { luceneFunction } from '../../common/search/expressions/lucene';
import { numericalRangeFunction } from '../../common/search/expressions/numerical_range';
import { phraseFilterFunction } from '../../common/search/expressions/phrase_filter';
import { queryFilterFunction } from '../../common/search/expressions/query_filter';
import { rangeFunction } from '../../common/search/expressions/range';
import { rangeFilterFunction } from '../../common/search/expressions/range_filter';
import { kibanaTimerangeFunction } from '../../common/search/expressions/timerange';
import type { SearchSourceDependencies } from '../../common/search/search_source/search_source';
import { SearchSourceService } from '../../common/search/search_source/search_source_service';
import type { ISearchGeneric } from '../../common/search/types';
import type { ConfigSchema } from '../../config';
import type { NowProviderInternalContract } from '../now_provider/now_provider';
import type { DataPublicPluginStart, DataStartDependencies } from '../types';
import type { AggsStartDependencies } from './aggs/aggs_service';
import { AggsService } from './aggs/aggs_service';
import { createUsageCollector } from './collectors/create_usage_collector';
import type { SearchUsageCollector } from './collectors/types';
import { getEsaggs } from './expressions/esaggs';
import { getEsdsl } from './expressions/esdsl';
import { getKibanaContext } from './expressions/kibana_context';
import { handleResponse } from './fetch/handle_response';
import type { ISearchInterceptor } from './search_interceptor/search_interceptor';
import { SearchInterceptor } from './search_interceptor/search_interceptor';
import type { ISessionsClient } from './session/sessions_client';
import { SessionsClient } from './session/sessions_client';
import type { ISessionService } from './session/session_service';
import { SessionService } from './session/session_service';
import type { ISearchSetup, ISearchStart } from './types';

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
    expressions.registerFunction(
      getKibanaContext({ getStartServices } as {
        getStartServices: StartServicesAccessor<DataStartDependencies, DataPublicPluginStart>;
      })
    );
    expressions.registerFunction(cidrFunction);
    expressions.registerFunction(dateRangeFunction);
    expressions.registerFunction(extendedBoundsFunction);
    expressions.registerFunction(ipRangeFunction);
    expressions.registerFunction(luceneFunction);
    expressions.registerFunction(kqlFunction);
    expressions.registerFunction(kibanaTimerangeFunction);
    expressions.registerFunction(fieldFunction);
    expressions.registerFunction(numericalRangeFunction);
    expressions.registerFunction(geoBoundingBoxFunction);
    expressions.registerFunction(geoPointFunction);
    expressions.registerFunction(rangeFunction);
    expressions.registerFunction(kibanaFilterFunction);
    expressions.registerFunction(existsFilterFunction);
    expressions.registerFunction(queryFilterFunction);
    expressions.registerFunction(rangeFilterFunction);
    expressions.registerFunction(phraseFilterFunction);
    expressions.registerType(kibanaContext);

    expressions.registerFunction(
      getEsdsl({ getStartServices } as {
        getStartServices: StartServicesAccessor<DataStartDependencies, DataPublicPluginStart>;
      })
    );
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
      session: this.sessionService,
      sessionsClient: this.sessionsClient,
    };
  }

  public start(
    { http, uiSettings }: CoreStart,
    { fieldFormats, indexPatterns }: SearchServiceStartDependencies
  ): ISearchStart {
    const search = ((request, options = {}) => {
      return this.searchInterceptor.search(request, options);
    }) as ISearchGeneric;

    const loadingCount$ = new BehaviorSubject(0);
    http.addLoadingCountSource(loadingCount$);

    const searchSourceDependencies: SearchSourceDependencies = {
      getConfig: uiSettings.get.bind(uiSettings),
      search,
      onResponse: handleResponse,
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
    this.searchInterceptor.stop();
  }
}
