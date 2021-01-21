/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
  SharedGlobalConfig,
  StartServicesAccessor,
} from 'src/core/server';
import { catchError, first, map } from 'rxjs/operators';
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
import { searchTelemetry } from '../saved_objects';
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
import { getEsaggs } from './expressions';
import {
  getShardDelayBucketAgg,
  SHARD_DELAY_AGG_NAME,
} from '../../common/search/aggs/buckets/shard_delay';
import { aggShardDelay } from '../../common/search/aggs/buckets/shard_delay_fn';
import { ConfigSchema } from '../../config';
import { SessionService, IScopedSessionService, ISessionService } from './session';
import { KbnServerError } from '../../../kibana_utils/server';

declare module 'src/core/server' {
  interface RequestHandlerContext {
    search?: ISearchClient & { session: IScopedSessionService };
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
  private sessionService: ISessionService;
  private coreStart?: CoreStart;

  constructor(
    private initializerContext: PluginInitializerContext<ConfigSchema>,
    private readonly logger: Logger
  ) {
    this.sessionService = new SessionService();
  }

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

    core.getStartServices().then(([coreStart]) => {
      this.coreStart = coreStart;
    });

    core.http.registerRouteHandlerContext('search', async (context, request) => {
      const search = this.asScopedProvider(this.coreStart!)(request);
      const session = this.sessionService.asScopedProvider(this.coreStart!)(request);
      return { ...search, session };
    });

    this.registerSearchStrategy(
      ES_SEARCH_STRATEGY,
      esSearchStrategyProvider(
        this.initializerContext.config.legacy.globalConfig$,
        this.logger,
        usage
      )
    );

    bfetch.addBatchProcessingRoute<
      { request: IKibanaSearchResponse; options?: ISearchOptions },
      any
    >('/internal/bsearch', (request) => {
      const search = this.asScopedProvider(this.coreStart!)(request);

      return {
        onBatchItem: async ({ request: requestData, options }) => {
          return search
            .search(requestData, options)
            .pipe(
              first(),
              map((response) => {
                return {
                  ...response,
                  ...{
                    rawResponse: shimHitsTotal(response.rawResponse),
                  },
                };
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
    });

    core.savedObjects.registerType(searchTelemetry);
    if (usageCollection) {
      registerUsageCollector(usageCollection, this.initializerContext);
    }

    expressions.registerFunction(getEsaggs({ getStartServices: core.getStartServices }));
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
        this.sessionService = enhancements.sessionService;
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
            onResponse: (req, res) => shimHitsTotal(res),
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
    session: IScopedSessionService,
    request: SearchStrategyRequest,
    options: ISearchOptions,
    deps: SearchStrategyDependencies
  ) => {
    const strategy = this.getSearchStrategy<SearchStrategyRequest, SearchStrategyResponse>(
      options.strategy
    );
    return session.search(strategy, request, options, deps);
  };

  private cancel = (id: string, options: ISearchOptions, deps: SearchStrategyDependencies) => {
    const strategy = this.getSearchStrategy(options.strategy);
    if (!strategy.cancel) {
      throw new KbnServerError(
        `Search strategy ${options.strategy} doesn't support cancellations`,
        400
      );
    }
    return strategy.cancel(id, options, deps);
  };

  private extend = (
    id: string,
    keepAlive: string,
    options: ISearchOptions,
    deps: SearchStrategyDependencies
  ) => {
    const strategy = this.getSearchStrategy(options.strategy);
    if (!strategy.extend) {
      throw new KbnServerError(`Search strategy ${options.strategy} does not support extend`, 400);
    }
    return strategy.extend(id, keepAlive, options, deps);
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
      throw new KbnServerError(`Search strategy ${name} not found`, 404);
    }
    return strategy;
  };

  private asScopedProvider = (core: CoreStart) => {
    const { elasticsearch, savedObjects, uiSettings } = core;
    const getSessionAsScoped = this.sessionService.asScopedProvider(core);
    return (request: KibanaRequest): ISearchClient => {
      const scopedSession = getSessionAsScoped(request);
      const savedObjectsClient = savedObjects.getScopedClient(request);
      const deps = {
        savedObjectsClient,
        esClient: elasticsearch.client.asScoped(request),
        uiSettingsClient: uiSettings.asScopedToClient(savedObjectsClient),
      };
      return {
        search: (searchRequest, options = {}) =>
          this.search(scopedSession, searchRequest, options, deps),
        cancel: (id, options = {}) => this.cancel(id, options, deps),
        extend: (id, keepAlive, options = {}) => this.extend(id, keepAlive, options, deps),
      };
    };
  };
}
