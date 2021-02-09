/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject, from, Observable, throwError } from 'rxjs';
import { pick } from 'lodash';
import moment from 'moment';
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
import { first, switchMap, tap } from 'rxjs/operators';
import { BfetchServerSetup } from 'src/plugins/bfetch/server';
import { ExpressionsServerSetup } from 'src/plugins/expressions/server';
import type {
  IScopedSearchClient,
  ISearchSetup,
  ISearchStart,
  ISearchStrategy,
  SearchEnhancements,
  SearchStrategyDependencies,
  DataRequestHandlerContext,
} from './types';

import { AggsService } from './aggs';

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
  IEsSearchRequest,
  IEsSearchResponse,
  IKibanaSearchRequest,
  IKibanaSearchResponse,
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
import { ISearchSessionService, SearchSessionService } from './session';
import { KbnServerError } from '../../../kibana_utils/server';
import { registerBsearchRoute } from './routes/bsearch';

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
  private sessionService: ISearchSessionService;
  private asScoped!: ISearchStart['asScoped'];

  constructor(
    private initializerContext: PluginInitializerContext<ConfigSchema>,
    private readonly logger: Logger
  ) {
    this.sessionService = new SearchSessionService();
  }

  public setup(
    core: CoreSetup<{}, DataPluginStart>,
    { bfetch, expressions, usageCollection }: SearchServiceSetupDependencies
  ): ISearchSetup {
    const usage = usageCollection ? usageProvider(core) : undefined;

    const router = core.http.createRouter<DataRequestHandlerContext>();
    const routeDependencies = {
      getStartServices: core.getStartServices,
      globalConfig$: this.initializerContext.config.legacy.globalConfig$,
    };
    registerSearchRoute(router);
    registerMsearchRoute(router, routeDependencies);

    core.http.registerRouteHandlerContext<DataRequestHandlerContext, 'search'>(
      'search',
      async (context, request) => {
        return this.asScoped(request);
      }
    );

    this.registerSearchStrategy(
      ES_SEARCH_STRATEGY,
      esSearchStrategyProvider(
        this.initializerContext.config.legacy.globalConfig$,
        this.logger,
        usage
      )
    );

    registerBsearchRoute(bfetch, (request: KibanaRequest) => this.asScoped(request));

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
    this.asScoped = this.asScopedProvider(core);
    return {
      aggs: this.aggsService.start({
        fieldFormats,
        uiSettings,
        indexPatterns,
      }),
      getSearchStrategy: this.getSearchStrategy,
      asScoped: this.asScoped,
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
            search: this.asScoped(request).search,
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

  private search = <
    SearchStrategyRequest extends IKibanaSearchRequest,
    SearchStrategyResponse extends IKibanaSearchResponse
  >(
    deps: SearchStrategyDependencies,
    request: SearchStrategyRequest,
    options: ISearchOptions
  ) => {
    try {
      const strategy = this.getSearchStrategy<SearchStrategyRequest, SearchStrategyResponse>(
        options.strategy
      );

      const getSearchRequest = async () =>
        !options.sessionId || !options.isRestore || request.id
          ? request
          : {
              ...request,
              id: await deps.searchSessionsClient.getId(request, options),
            };

      return from(getSearchRequest()).pipe(
        switchMap((searchRequest) => strategy.search(searchRequest, options, deps)),
        tap((response) => {
          if (!options.sessionId || !response.id || options.isRestore) return;
          // intentionally swallow tracking error, as it shouldn't fail the search
          deps.searchSessionsClient.trackId(request, response.id, options).catch((trackErr) => {
            this.logger.error(trackErr);
          });
        })
      );
    } catch (e) {
      return throwError(e);
    }
  };

  private cancel = async (
    deps: SearchStrategyDependencies,
    id: string,
    options: ISearchOptions = {}
  ) => {
    const strategy = this.getSearchStrategy(options.strategy);
    if (!strategy.cancel) {
      throw new KbnServerError(
        `Search strategy ${options.strategy} doesn't support cancellations`,
        400
      );
    }
    return strategy.cancel(id, options, deps);
  };

  private extend = async (
    deps: SearchStrategyDependencies,
    id: string,
    keepAlive: string,
    options: ISearchOptions = {}
  ) => {
    const strategy = this.getSearchStrategy(options.strategy);
    if (!strategy.extend) {
      throw new KbnServerError(`Search strategy ${options.strategy} does not support extend`, 400);
    }
    return strategy.extend(id, keepAlive, options, deps);
  };

  private cancelSessionSearches = async (deps: SearchStrategyDependencies, sessionId: string) => {
    const searchIdMapping = await deps.searchSessionsClient.getSearchIdMapping(sessionId);
    await Promise.allSettled(
      Array.from(searchIdMapping).map(([searchId, strategyName]) => {
        const searchOptions = {
          sessionId,
          strategy: strategyName,
          isStored: true,
        };
        return this.cancel(deps, searchId, searchOptions);
      })
    );
  };

  private cancelSession = async (deps: SearchStrategyDependencies, sessionId: string) => {
    const response = await deps.searchSessionsClient.cancel(sessionId);
    await this.cancelSessionSearches(deps, sessionId);
    return response;
  };

  private deleteSession = async (deps: SearchStrategyDependencies, sessionId: string) => {
    await this.cancelSessionSearches(deps, sessionId);
    return deps.searchSessionsClient.delete(sessionId);
  };

  private extendSession = async (
    deps: SearchStrategyDependencies,
    sessionId: string,
    expires: Date
  ) => {
    const searchIdMapping = await deps.searchSessionsClient.getSearchIdMapping(sessionId);
    const keepAlive = `${moment(expires).diff(moment())}ms`;

    const result = await Promise.allSettled(
      Array.from(searchIdMapping).map(([searchId, strategyName]) => {
        const searchOptions = {
          sessionId,
          strategy: strategyName,
          isStored: true,
        };
        return this.extend(deps, searchId, keepAlive, searchOptions);
      })
    );

    if (result.some((extRes) => extRes.status === 'rejected')) {
      throw new Error('Failed to extend the expiration of some searches');
    }

    return deps.searchSessionsClient.extend(sessionId, expires);
  };

  private asScopedProvider = (core: CoreStart) => {
    const { elasticsearch, savedObjects, uiSettings } = core;
    const getSessionAsScoped = this.sessionService.asScopedProvider(core);
    return (request: KibanaRequest): IScopedSearchClient => {
      const savedObjectsClient = savedObjects.getScopedClient(request);
      const searchSessionsClient = getSessionAsScoped(request);
      const deps = {
        searchSessionsClient,
        savedObjectsClient,
        esClient: elasticsearch.client.asScoped(request),
        uiSettingsClient: uiSettings.asScopedToClient(savedObjectsClient),
      };
      return {
        search: <
          SearchStrategyRequest extends IKibanaSearchRequest = IEsSearchRequest,
          SearchStrategyResponse extends IKibanaSearchResponse = IEsSearchResponse
        >(
          searchRequest: SearchStrategyRequest,
          options: ISearchOptions = {}
        ) =>
          this.search<SearchStrategyRequest, SearchStrategyResponse>(deps, searchRequest, options),
        cancel: this.cancel.bind(this, deps),
        extend: this.extend.bind(this, deps),
        saveSession: searchSessionsClient.save,
        getSession: searchSessionsClient.get,
        findSessions: searchSessionsClient.find,
        updateSession: searchSessionsClient.update,
        extendSession: this.extendSession.bind(this, deps),
        cancelSession: this.cancelSession.bind(this, deps),
        deleteSession: this.deleteSession.bind(this, deps),
      };
    };
  };
}
