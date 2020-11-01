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

import { BehaviorSubject, Observable } from 'rxjs';
import { pick } from 'lodash';
import {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
  RequestHandlerContext,
  SharedGlobalConfig,
  StartServicesAccessor,
} from 'src/core/server';
import { first } from 'rxjs/operators';
import { ISearchSetup, ISearchStart, ISearchStrategy, SearchEnhancements } from './types';

import { AggsService, AggsSetupDependencies } from './aggs';

import { FieldFormatsStart } from '../field_formats';
import { IndexPatternsServiceStart } from '../index_patterns';
import { getCallMsearch, registerMsearchRoute, registerSearchRoute } from './routes';
import { ES_SEARCH_STRATEGY, esSearchStrategyProvider } from './es_search';
import { DataPluginStart } from '../plugin';
import { UsageCollectionSetup } from '../../../usage_collection/server';
import { registerUsageCollector } from './collectors/register';
import { usageProvider } from './collectors/usage';
import { searchTelemetry } from '../saved_objects';
import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  IEsSearchRequest,
  IEsSearchResponse,
  SearchSourceDependencies,
  SearchSourceService,
  searchSourceRequiredUiSettings,
  ISearchOptions,
} from '../../common/search';
import {
  getShardDelayBucketAgg,
  SHARD_DELAY_AGG_NAME,
} from '../../common/search/aggs/buckets/shard_delay';
import { aggShardDelay } from '../../common/search/aggs/buckets/shard_delay_fn';
import { ConfigSchema } from '../../config';

type StrategyMap = Record<string, ISearchStrategy<any, any>>;

/** @internal */
export interface SearchServiceSetupDependencies {
  registerFunction: AggsSetupDependencies['registerFunction'];
  usageCollection?: UsageCollectionSetup;
}

/** @internal */
export interface SearchServiceStartDependencies {
  fieldFormats: FieldFormatsStart;
  indexPatterns: IndexPatternsServiceStart;
}

/** @internal */
export interface SearchRouteDependencies {
  getStartServices: StartServicesAccessor<{}, DataPluginStart>;
  globalConfig$: Observable<SharedGlobalConfig>;
}

export class SearchService implements Plugin<ISearchSetup, ISearchStart> {
  private readonly aggsService = new AggsService();
  private readonly searchSourceService = new SearchSourceService();
  private defaultSearchStrategyName: string = ES_SEARCH_STRATEGY;
  private searchStrategies: StrategyMap = {};

  constructor(
    private initializerContext: PluginInitializerContext<ConfigSchema>,
    private readonly logger: Logger
  ) {}

  public setup(
    core: CoreSetup<{}, DataPluginStart>,
    { registerFunction, usageCollection }: SearchServiceSetupDependencies
  ): ISearchSetup {
    const usage = usageCollection ? usageProvider(core) : undefined;

    const router = core.http.createRouter();
    const routeDependencies = {
      getStartServices: core.getStartServices,
      globalConfig$: this.initializerContext.config.legacy.globalConfig$,
    };
    registerSearchRoute(router, routeDependencies);
    registerMsearchRoute(router, routeDependencies);

    this.registerSearchStrategy(
      ES_SEARCH_STRATEGY,
      esSearchStrategyProvider(
        this.initializerContext.config.legacy.globalConfig$,
        this.logger,
        usage
      )
    );

    core.savedObjects.registerType(searchTelemetry);
    if (usageCollection) {
      registerUsageCollector(usageCollection, this.initializerContext);
    }

    const aggs = this.aggsService.setup({ registerFunction });

    this.initializerContext.config
      .create<ConfigSchema>()
      .pipe(first())
      .toPromise()
      .then((value) => {
        if (value.search.aggs.shardDelay.enabled) {
          aggs.types.registerBucket(SHARD_DELAY_AGG_NAME, getShardDelayBucketAgg);
          registerFunction(aggShardDelay);
        }
      });

    return {
      __enhance: (enhancements: SearchEnhancements) => {
        if (this.searchStrategies.hasOwnProperty(enhancements.defaultStrategy)) {
          this.defaultSearchStrategyName = enhancements.defaultStrategy;
        }
      },
      aggs,
      registerSearchStrategy: this.registerSearchStrategy,
      usage,
    };
  }
  public start(
    { elasticsearch, savedObjects, uiSettings }: CoreStart,
    { fieldFormats, indexPatterns }: SearchServiceStartDependencies
  ): ISearchStart {
    return {
      aggs: this.aggsService.start({
        fieldFormats,
        uiSettings,
        indexPatterns,
      }),
      getSearchStrategy: this.getSearchStrategy,
      search: this.search.bind(this),
      searchSource: {
        asScoped: async (request: KibanaRequest) => {
          const esClient = elasticsearch.client.asScoped(request);
          const savedObjectsClient = savedObjects.getScopedClient(request);
          const scopedIndexPatterns = await indexPatterns.indexPatternsServiceFactory(
            savedObjectsClient,
            esClient.asCurrentUser
          );
          const uiSettingsClient = uiSettings.asScopedToClient(savedObjectsClient);

          // cache ui settings, only including items which are explicitly needed by SearchSource
          const uiSettingsCache = pick(
            await uiSettingsClient.getAll(),
            searchSourceRequiredUiSettings
          );

          const searchSourceDependencies: SearchSourceDependencies = {
            getConfig: <T = any>(key: string): T => uiSettingsCache[key],
            search: <
              SearchStrategyRequest extends IKibanaSearchRequest = IEsSearchRequest,
              SearchStrategyResponse extends IKibanaSearchResponse = IEsSearchResponse
            >(
              searchStrategyRequest: SearchStrategyRequest,
              options: ISearchOptions
            ) => {
              /**
               * Unless we want all SearchSource users to provide both a KibanaRequest
               * (needed for index patterns) AND the RequestHandlerContext (needed for
               * low-level search), we need to fake the context as it can be derived
               * from the request object anyway. This will pose problems for folks who
               * are registering custom search strategies as they are only getting a
               * subset of the entire context. Ideally low-level search should be
               * refactored to only require the needed dependencies: esClient & uiSettings.
               */
              const fakeRequestHandlerContext = {
                core: {
                  elasticsearch: {
                    client: esClient,
                  },
                  uiSettings: {
                    client: uiSettingsClient,
                  },
                },
              } as RequestHandlerContext;

              return this.search<SearchStrategyRequest, SearchStrategyResponse>(
                searchStrategyRequest,
                options,
                fakeRequestHandlerContext
              ).toPromise();
            },
            // onResponse isn't used on the server, so we just return the original value
            onResponse: (req, res) => res,
            legacy: {
              callMsearch: getCallMsearch({
                esClient,
                globalConfig$: this.initializerContext.config.legacy.globalConfig$,
                uiSettings: uiSettingsClient,
              }),
              loadingCount$: new BehaviorSubject(0),
            },
          };

          return this.searchSourceService.start(scopedIndexPatterns, searchSourceDependencies);
        },
      },
    };
  }

  public stop() {
    this.aggsService.stop();
  }

  private registerSearchStrategy = <
    SearchStrategyRequest extends IKibanaSearchRequest = IEsSearchRequest,
    SearchStrategyResponse extends IKibanaSearchResponse = IEsSearchResponse
  >(
    name: string,
    strategy: ISearchStrategy<SearchStrategyRequest, SearchStrategyResponse>
  ) => {
    this.logger.debug(`Register strategy ${name}`);
    this.searchStrategies[name] = strategy;
  };

  private search = <
    SearchStrategyRequest extends IKibanaSearchRequest = IEsSearchRequest,
    SearchStrategyResponse extends IKibanaSearchResponse = IEsSearchResponse
  >(
    searchRequest: SearchStrategyRequest,
    options: ISearchOptions,
    context: RequestHandlerContext
  ) => {
    const strategy = this.getSearchStrategy<SearchStrategyRequest, SearchStrategyResponse>(
      options.strategy || this.defaultSearchStrategyName
    );

    return strategy.search(searchRequest, options, context);
  };

  private getSearchStrategy = <
    SearchStrategyRequest extends IKibanaSearchRequest = IEsSearchRequest,
    SearchStrategyResponse extends IKibanaSearchResponse = IEsSearchResponse
  >(
    name: string
  ): ISearchStrategy<SearchStrategyRequest, SearchStrategyResponse> => {
    this.logger.debug(`Get strategy ${name}`);
    const strategy = this.searchStrategies[name];
    if (!strategy) {
      throw new Error(`Search strategy ${name} not found`);
    }
    return strategy;
  };
}
