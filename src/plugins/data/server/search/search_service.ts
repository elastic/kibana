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

import { BehaviorSubject, from, Observable } from 'rxjs';
import { pick } from 'lodash';
import {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
  SharedGlobalConfig,
  StartServicesAccessor,
} from 'src/core/server';
import { catchError, first, map, switchMap } from 'rxjs/operators';
import { BfetchServerSetup } from 'src/plugins/bfetch/server';
import { ExpressionsServerSetup } from 'src/plugins/expressions/server';
import {
  ISearchSetup,
  ISearchStart,
  ISearchStrategy,
  SearchEnhancements,
  SearchStrategyDependencies,
} from './types';

import { AggsService } from './aggs';

import { FieldFormatsStart } from '../field_formats';
import { IndexPatternsServiceStart } from '../index_patterns';
import { getCallMsearch, registerMsearchRoute, registerSearchRoute, shimHitsTotal } from './routes';
import { ES_SEARCH_STRATEGY, esSearchStrategyProvider } from './es_search';
import { DataPluginStart } from '../plugin';
import { UsageCollectionSetup } from '../../../usage_collection/server';
import { registerUsageCollector } from './collectors/register';
import { usageProvider } from './collectors/usage';
import { BACKGROUND_SESSION_TYPE, searchTelemetry } from '../saved_objects';
import {
  IEsSearchRequest,
  IEsSearchResponse,
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchClient,
  ISearchOptions,
  kibana,
  kibanaContext,
  kibanaContextFunction,
  SearchSourceDependencies,
  searchSourceRequiredUiSettings,
  SearchSourceService,
} from '../../common/search';
import {
  getShardDelayBucketAgg,
  SHARD_DELAY_AGG_NAME,
} from '../../common/search/aggs/buckets/shard_delay';
import { aggShardDelay } from '../../common/search/aggs/buckets/shard_delay_fn';
import { ConfigSchema } from '../../config';
import { BackgroundSessionService, ISearchSessionClient } from './session';
import { registerSessionRoutes } from './routes/session';
import { backgroundSessionMapping } from '../saved_objects';
import { tapFirst } from '../../common/utils';

declare module 'src/core/server' {
  interface RequestHandlerContext {
    search?: ISearchClient & { session: ISearchSessionClient };
  }
}

type StrategyMap = Record<string, ISearchStrategy<any, any>>;

/** @internal */
export interface SearchServiceSetupDependencies {
  bfetch: BfetchServerSetup;
  expressions: ExpressionsServerSetup;
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
  private coreStart?: CoreStart;
  private sessionService: BackgroundSessionService = new BackgroundSessionService();

  constructor(
    private initializerContext: PluginInitializerContext<ConfigSchema>,
    private readonly logger: Logger
  ) {}

  public setup(
    core: CoreSetup<{}, DataPluginStart>,
    { bfetch, expressions, usageCollection }: SearchServiceSetupDependencies
  ): ISearchSetup {
    const usage = usageCollection ? usageProvider(core) : undefined;

    const router = core.http.createRouter();
    const routeDependencies = {
      getStartServices: core.getStartServices,
      globalConfig$: this.initializerContext.config.legacy.globalConfig$,
    };
    registerSearchRoute(router);
    registerMsearchRoute(router, routeDependencies);
    registerSessionRoutes(router);

    core.getStartServices().then(([coreStart]) => {
      this.coreStart = coreStart;
    });

    core.http.registerRouteHandlerContext('search', async (context, request) => {
      const search = this.asScopedProvider(this.coreStart!)(request);
      const session = this.sessionService.asScopedProvider(this.coreStart!)(request);
      return { ...search, session };
    });

    core.savedObjects.registerType(backgroundSessionMapping);

    this.registerSearchStrategy(
      ES_SEARCH_STRATEGY,
      esSearchStrategyProvider(
        this.initializerContext.config.legacy.globalConfig$,
        this.logger,
        usage
      )
    );

    bfetch.addBatchProcessingRoute<{ request: IKibanaSearchRequest; options?: ISearchOptions }, any>(
      '/internal/bsearch',
      (request) => {
        const search = this.asScopedProvider(this.coreStart!)(request);

        return {
          onBatchItem: async ({ request: requestData, options }) => {
            return search
              .search(requestData, options)
              .pipe(
                first(),
                map(response => {
                  return {
                    ...response,
                    ...{
                      rawResponse: shimHitsTotal(response.rawResponse),
                    }
                  }
                }),
                catchError((err) => {
                  // eslint-disable-next-line no-throw-literal
                  throw {
                    statusCode: err.statusCode || 500,
                    body: {
                      message: err.message,
                      attributes: {
                        error: err.body?.error || err.message,
                      },
                    },
                  };
                })
              )
              .toPromise();
          },
        };
      }
    );

    core.savedObjects.registerType(searchTelemetry);
    if (usageCollection) {
      registerUsageCollector(usageCollection, this.initializerContext);
    }

    expressions.registerFunction(kibana);
    expressions.registerFunction(kibanaContextFunction);
    expressions.registerType(kibanaContext);

    const aggs = this.aggsService.setup({ registerFunction: expressions.registerFunction });

    this.initializerContext.config
      .create<ConfigSchema>()
      .pipe(first())
      .toPromise()
      .then((value) => {
        if (value.search.aggs.shardDelay.enabled) {
          aggs.types.registerBucket(SHARD_DELAY_AGG_NAME, getShardDelayBucketAgg);
          expressions.registerFunction(aggShardDelay);
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
    core: CoreStart,
    { fieldFormats, indexPatterns }: SearchServiceStartDependencies
  ): ISearchStart {
    const { elasticsearch, savedObjects, uiSettings } = core;
    const asScoped = this.asScopedProvider(core);
    return {
      aggs: this.aggsService.start({
        fieldFormats,
        uiSettings,
        indexPatterns,
      }),
      getSearchStrategy: this.getSearchStrategy,
      asScoped,
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
            search: asScoped(request).search,
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
    this.sessionService.stop();
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
    deps: SearchStrategyDependencies
  ) => {
    const strategy = this.getSearchStrategy<SearchStrategyRequest, SearchStrategyResponse>(
      options.strategy
    );

    // If this is a restored background search session, look up the ID using the provided sessionId
    const getSearchRequest = async () =>
      !options.isRestore || searchRequest.id
        ? searchRequest
        : {
            ...searchRequest,
            id: await this.sessionService.getId(searchRequest, options, deps),
          };

    return from(getSearchRequest()).pipe(
      switchMap((request) => strategy.search(request, options, deps)),
      tapFirst((response) => {
        if (searchRequest.id || !options.sessionId || !response.id || options.isRestore) return;
        this.sessionService.trackId(searchRequest, response.id, options, {
          savedObjectsClient: deps.savedObjectsClient,
        });
      })
    );
  };

  private cancel = (id: string, options: ISearchOptions, deps: SearchStrategyDependencies) => {
    const strategy = this.getSearchStrategy(options.strategy);

    return strategy.cancel ? strategy.cancel(id, options, deps) : Promise.resolve();
  };

  private getSearchStrategy = <
    SearchStrategyRequest extends IKibanaSearchRequest = IEsSearchRequest,
    SearchStrategyResponse extends IKibanaSearchResponse = IEsSearchResponse
  >(
    name: string = this.defaultSearchStrategyName
  ): ISearchStrategy<SearchStrategyRequest, SearchStrategyResponse> => {
    this.logger.debug(`Get strategy ${name}`);
    const strategy = this.searchStrategies[name];
    if (!strategy) {
      throw new Error(`Search strategy ${name} not found`);
    }
    return strategy;
  };

  private asScopedProvider = ({ elasticsearch, savedObjects, uiSettings }: CoreStart) => {
    return (request: KibanaRequest): ISearchClient => {
      const savedObjectsClient = savedObjects.getScopedClient(request, {
        includedHiddenTypes: [BACKGROUND_SESSION_TYPE],
      });
      const deps = {
        savedObjectsClient,
        esClient: elasticsearch.client.asScoped(request),
        uiSettingsClient: uiSettings.asScopedToClient(savedObjectsClient),
      };
      return {
        search: (searchRequest, options = {}) => this.search(searchRequest, options, deps),
        cancel: (id, options = {}) => this.cancel(id, options, deps),
      };
    };
  };
}
