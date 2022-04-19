/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom, from, Observable, throwError } from 'rxjs';
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
} from '@kbn/core/server';
import { map, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { BfetchServerSetup } from '@kbn/bfetch-plugin/server';
import { ExpressionsServerSetup } from '@kbn/expressions-plugin/server';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { KbnServerError } from '@kbn/kibana-utils-plugin/server';
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

import { IndexPatternsServiceStart } from '../data_views';
import { registerSearchRoute } from './routes';
import { ES_SEARCH_STRATEGY, esSearchStrategyProvider } from './strategies/es_search';
import { DataPluginStart, DataPluginStartDependencies } from '../plugin';
import { registerUsageCollector } from './collectors/register';
import { usageProvider } from './collectors/usage';
import { searchTelemetry } from '../saved_objects';
import {
  existsFilterFunction,
  fieldFunction,
  IEsSearchRequest,
  IEsSearchResponse,
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptions,
  cidrFunction,
  dateRangeFunction,
  extendedBoundsFunction,
  geoBoundingBoxFunction,
  geoPointFunction,
  ipRangeFunction,
  kibana,
  kibanaContext,
  kibanaTimerangeFunction,
  kibanaFilterFunction,
  kqlFunction,
  luceneFunction,
  numericalRangeFunction,
  queryFilterFunction,
  rangeFilterFunction,
  removeFilterFunction,
  selectFilterFunction,
  rangeFunction,
  SearchSourceDependencies,
  searchSourceRequiredUiSettings,
  SearchSourceService,
  phraseFilterFunction,
  esRawResponse,
  eqlRawResponse,
  ENHANCED_ES_SEARCH_STRATEGY,
  EQL_SEARCH_STRATEGY,
  SQL_SEARCH_STRATEGY,
} from '../../common/search';
import { getEsaggs, getEsdsl, getEql } from './expressions';
import {
  getShardDelayBucketAgg,
  SHARD_DELAY_AGG_NAME,
} from '../../common/search/aggs/buckets/shard_delay';
import { aggShardDelay } from '../../common/search/aggs/buckets/shard_delay_fn';
import { ConfigSchema } from '../../config';
import { ISearchSessionService, SearchSessionService } from './session';
import { registerBsearchRoute } from './routes/bsearch';
import { getKibanaContext } from './expressions/kibana_context';
import { enhancedEsSearchStrategyProvider } from './strategies/ese_search';
import { eqlSearchStrategyProvider } from './strategies/eql_search';
import { NoSearchIdInSessionError } from './errors/no_search_id_in_session';
import { CachedUiSettingsClient } from './services';
import { sqlSearchStrategyProvider } from './strategies/sql_search';

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
  private searchStrategies: StrategyMap = {};
  private sessionService: ISearchSessionService;
  private asScoped!: ISearchStart['asScoped'];
  private searchAsInternalUser!: ISearchStrategy;

  constructor(
    private initializerContext: PluginInitializerContext<ConfigSchema>,
    private readonly logger: Logger
  ) {
    this.sessionService = new SearchSessionService();
  }

  public setup(
    core: CoreSetup<DataPluginStartDependencies, DataPluginStart>,
    { bfetch, expressions, usageCollection }: SearchServiceSetupDependencies
  ): ISearchSetup {
    const usage = usageCollection ? usageProvider(core) : undefined;

    const router = core.http.createRouter<DataRequestHandlerContext>();
    registerSearchRoute(router);

    core.http.registerRouteHandlerContext<DataRequestHandlerContext, 'search'>(
      'search',
      (context, request) => {
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

    this.registerSearchStrategy(
      ENHANCED_ES_SEARCH_STRATEGY,
      enhancedEsSearchStrategyProvider(
        this.initializerContext.config.legacy.globalConfig$,
        this.logger,
        usage
      )
    );

    // We don't want to register this because we don't want the client to be able to access this
    // strategy, but we do want to expose it to other server-side plugins
    // see x-pack/plugins/security_solution/server/search_strategy/timeline/index.ts
    // for example use case
    this.searchAsInternalUser = enhancedEsSearchStrategyProvider(
      this.initializerContext.config.legacy.globalConfig$,
      this.logger,
      usage,
      true
    );

    this.registerSearchStrategy(EQL_SEARCH_STRATEGY, eqlSearchStrategyProvider(this.logger));
    this.registerSearchStrategy(SQL_SEARCH_STRATEGY, sqlSearchStrategyProvider(this.logger));

    registerBsearchRoute(
      bfetch,
      (request: KibanaRequest) => this.asScoped(request),
      core.executionContext
    );

    core.savedObjects.registerType(searchTelemetry);
    if (usageCollection) {
      registerUsageCollector(usageCollection, core.savedObjects.getKibanaIndex());
    }

    expressions.registerFunction(getEsaggs({ getStartServices: core.getStartServices }));
    expressions.registerFunction(getEsdsl({ getStartServices: core.getStartServices }));
    expressions.registerFunction(getEql({ getStartServices: core.getStartServices }));
    expressions.registerFunction(cidrFunction);
    expressions.registerFunction(dateRangeFunction);
    expressions.registerFunction(extendedBoundsFunction);
    expressions.registerFunction(geoBoundingBoxFunction);
    expressions.registerFunction(geoPointFunction);
    expressions.registerFunction(ipRangeFunction);
    expressions.registerFunction(kibana);
    expressions.registerFunction(luceneFunction);
    expressions.registerFunction(kqlFunction);
    expressions.registerFunction(kibanaTimerangeFunction);
    expressions.registerFunction(getKibanaContext({ getStartServices: core.getStartServices }));
    expressions.registerFunction(fieldFunction);
    expressions.registerFunction(numericalRangeFunction);
    expressions.registerFunction(rangeFunction);
    expressions.registerFunction(kibanaFilterFunction);
    expressions.registerFunction(existsFilterFunction);
    expressions.registerFunction(queryFilterFunction);
    expressions.registerFunction(rangeFilterFunction);
    expressions.registerFunction(removeFilterFunction);
    expressions.registerFunction(selectFilterFunction);
    expressions.registerFunction(phraseFilterFunction);
    expressions.registerType(kibanaContext);
    expressions.registerType(esRawResponse);
    expressions.registerType(eqlRawResponse);

    const aggs = this.aggsService.setup({ registerFunction: expressions.registerFunction });

    firstValueFrom(this.initializerContext.config.create<ConfigSchema>()).then((value) => {
      if (value.search.aggs.shardDelay.enabled) {
        aggs.types.registerBucket(SHARD_DELAY_AGG_NAME, getShardDelayBucketAgg);
        expressions.registerFunction(aggShardDelay);
      }
    });

    return {
      __enhance: (enhancements: SearchEnhancements) => {
        this.sessionService = enhancements.sessionService;
      },
      aggs,
      registerSearchStrategy: this.registerSearchStrategy,
      usage,
      searchSource: this.searchSourceService.setup(),
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
      searchAsInternalUser: this.searchAsInternalUser,
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
    SearchStrategyResponse extends IKibanaSearchResponse<any> = IEsSearchResponse
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
    name: string = ENHANCED_ES_SEARCH_STRATEGY
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

      const getSearchRequest = async () => {
        if (!options.sessionId || !options.isRestore || request.id) {
          return request;
        } else {
          try {
            const id = await deps.searchSessionsClient.getId(request, options);
            this.logger.debug(`Found search session id for request ${id}`);
            return {
              ...request,
              id,
            };
          } catch (e) {
            if (e instanceof NoSearchIdInSessionError) {
              this.logger.debug('Ignoring missing search ID');
              return request;
            } else {
              throw e;
            }
          }
        }
      };

      const searchRequest$ = from(getSearchRequest());
      const search$ = searchRequest$.pipe(
        switchMap((searchRequest) => strategy.search(searchRequest, options, deps)),
        withLatestFrom(searchRequest$),
        tap(([response, requestWithId]) => {
          if (!options.sessionId || !response.id || (options.isRestore && requestWithId.id)) return;
          // intentionally swallow tracking error, as it shouldn't fail the search
          deps.searchSessionsClient.trackId(request, response.id, options).catch((trackErr) => {
            this.logger.error(trackErr);
          });
        }),
        map(([response, requestWithId]) => {
          return {
            ...response,
            isRestored: !!requestWithId.id,
          };
        })
      );

      return search$;
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
        uiSettingsClient: new CachedUiSettingsClient(
          uiSettings.asScopedToClient(savedObjectsClient)
        ),
        request,
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
