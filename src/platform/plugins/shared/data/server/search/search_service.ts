/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import { concatMap, firstValueFrom, from, of, throwError } from 'rxjs';
import { pick } from 'lodash';
import moment from 'moment';
import type {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  PluginInitializerContext,
  SharedGlobalConfig,
  StartServicesAccessor,
} from '@kbn/core/server';
import { catchError, map, switchMap, tap } from 'rxjs';
import type {
  IKibanaSearchResponse,
  IKibanaSearchRequest,
  ISearchOptions,
  IEsSearchRequest,
  IEsSearchResponse,
} from '@kbn/search-types';
import type { ExpressionsServerSetup } from '@kbn/expressions-plugin/server';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { KbnServerError } from '@kbn/kibana-utils-plugin/server';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import type {
  DataRequestHandlerContext,
  IScopedSearchClient,
  ISearchSetup,
  ISearchStart,
  ISearchStrategy,
  SearchStrategyDependencies,
} from './types';

import { AggsService } from './aggs';

import { registerSearchRoute, registerSessionRoutes } from './routes';
import { ES_SEARCH_STRATEGY, esSearchStrategyProvider } from './strategies/es_search';
import type { DataPluginStart, DataPluginStartDependencies } from '../plugin';
import { usageProvider } from './collectors/search/usage';
import { registerUsageCollector as registerSearchUsageCollector } from './collectors/search/register';
import { registerUsageCollector as registerSearchSessionUsageCollector } from './collectors/search_session/register';
import { searchTelemetry } from '../saved_objects';
import type { SearchSourceDependencies } from '../../common/search';
import {
  cidrFunction,
  dateRangeFunction,
  ENHANCED_ES_SEARCH_STRATEGY,
  EQL_SEARCH_STRATEGY,
  esRawResponse,
  existsFilterFunction,
  extendedBoundsFunction,
  fieldFunction,
  geoBoundingBoxFunction,
  geoPointFunction,
  ipPrefixFunction,
  ipRangeFunction,
  kibana,
  kibanaFilterFunction,
  kibanaTimerangeFunction,
  kqlFunction,
  luceneFunction,
  numericalRangeFunction,
  phraseFilterFunction,
  queryFilterFunction,
  rangeFilterFunction,
  selectFilterFunction,
  rangeFunction,
  removeFilterFunction,
  searchSourceRequiredUiSettings,
  SearchSourceService,
  eqlRawResponse,
  SQL_SEARCH_STRATEGY,
  ESQL_SEARCH_STRATEGY,
  ESQL_ASYNC_SEARCH_STRATEGY,
} from '../../common/search';
import { getEsaggs, getEsdsl, getEssql, getEql, getEsql } from './expressions';
import {
  getShardDelayBucketAgg,
  SHARD_DELAY_AGG_NAME,
} from '../../common/search/aggs/buckets/shard_delay';
import { aggShardDelay } from '../../common/search/aggs/buckets/shard_delay_fn';
import type { ConfigSchema } from '../config';
import { SearchSessionService } from './session';
import {
  enhancedEsSearchStrategyProvider,
  INTERNAL_ENHANCED_ES_SEARCH_STRATEGY,
} from './strategies/ese_search';
import { eqlSearchStrategyProvider } from './strategies/eql_search';
import { NoSearchIdInSessionError } from './errors/no_search_id_in_session';
import { CachedUiSettingsClient } from './services';
import { sqlSearchStrategyProvider } from './strategies/sql_search';
import { searchSessionSavedObjectType } from './saved_objects';
import { esqlSearchStrategyProvider } from './strategies/esql_search';
import { esqlAsyncSearchStrategyProvider } from './strategies/esql_async_search';

type StrategyMap = Map<string | symbol, ISearchStrategy<any, any>>;

/** @internal */
export interface SearchServiceSetupDependencies {
  expressions: ExpressionsServerSetup;
  usageCollection?: UsageCollectionSetup;
}

/** @internal */
export interface SearchServiceStartDependencies {
  fieldFormats: FieldFormatsStart;
  indexPatterns: DataViewsServerPluginStart;
}

/** @internal */
export interface SearchRouteDependencies {
  getStartServices: StartServicesAccessor<{}, DataPluginStart>;
  globalConfig$: Observable<SharedGlobalConfig>;
}

export class SearchService {
  private readonly aggsService = new AggsService();
  private readonly searchSourceService = new SearchSourceService();
  private searchStrategies: StrategyMap = new Map();
  private sessionService: SearchSessionService;
  private asScoped!: ISearchStart['asScoped'];
  private searchAsInternalUser!: ISearchStrategy;
  private rollupsEnabled: boolean = false;
  private readonly isServerless: boolean;

  constructor(
    private initializerContext: PluginInitializerContext<ConfigSchema>,
    private readonly logger: Logger
  ) {
    this.isServerless = initializerContext.env.packageInfo.buildFlavor === 'serverless';
    this.sessionService = new SearchSessionService(
      logger,
      initializerContext.config.get(),
      initializerContext.env.packageInfo.version
    );
  }

  public setup(
    core: CoreSetup<DataPluginStartDependencies, DataPluginStart>,
    { expressions, usageCollection }: SearchServiceSetupDependencies
  ): ISearchSetup {
    core.savedObjects.registerType(searchSessionSavedObjectType);
    const usage = usageCollection ? usageProvider(core) : undefined;

    const router = core.http.createRouter<DataRequestHandlerContext>();
    registerSearchRoute(router, this.logger, core.executionContext);
    registerSessionRoutes(router, this.logger);

    this.sessionService.setup(core, {});

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
        this.initializerContext.config.get().search,
        this.logger,
        usage,
        false,
        this.isServerless
      )
    );
    this.registerSearchStrategy(ESQL_SEARCH_STRATEGY, esqlSearchStrategyProvider(this.logger));
    this.registerSearchStrategy(
      ESQL_ASYNC_SEARCH_STRATEGY,
      esqlAsyncSearchStrategyProvider(this.initializerContext.config.get().search, this.logger)
    );

    this.searchAsInternalUser = enhancedEsSearchStrategyProvider(
      this.initializerContext.config.legacy.globalConfig$,
      this.initializerContext.config.get().search,
      this.logger,
      usage,
      true
    );
    this.registerSearchStrategy(INTERNAL_ENHANCED_ES_SEARCH_STRATEGY, this.searchAsInternalUser);

    this.registerSearchStrategy(
      EQL_SEARCH_STRATEGY,
      eqlSearchStrategyProvider(this.initializerContext.config.get().search, this.logger)
    );
    this.registerSearchStrategy(
      SQL_SEARCH_STRATEGY,
      sqlSearchStrategyProvider(this.initializerContext.config.get().search, this.logger)
    );

    core.savedObjects.registerType(searchTelemetry);
    if (usageCollection) {
      const getIndexForType = (type: string) =>
        core.getStartServices().then(([coreStart]) => coreStart.savedObjects.getIndexForType(type));
      registerSearchUsageCollector(usageCollection, getIndexForType);
      registerSearchSessionUsageCollector(usageCollection, getIndexForType, this.logger);
    }

    expressions.registerFunction(getEsaggs({ getStartServices: core.getStartServices }));
    expressions.registerFunction(getEsdsl({ getStartServices: core.getStartServices }));
    expressions.registerFunction(getEssql({ getStartServices: core.getStartServices }));
    expressions.registerFunction(getEql({ getStartServices: core.getStartServices }));
    expressions.registerFunction(getEsql({ getStartServices: core.getStartServices }));
    expressions.registerFunction(cidrFunction);
    expressions.registerFunction(dateRangeFunction);
    expressions.registerFunction(extendedBoundsFunction);
    expressions.registerFunction(geoBoundingBoxFunction);
    expressions.registerFunction(geoPointFunction);
    expressions.registerFunction(ipPrefixFunction);
    expressions.registerFunction(ipRangeFunction);
    expressions.registerFunction(kibana);
    expressions.registerFunction(luceneFunction);
    expressions.registerFunction(kqlFunction);
    expressions.registerFunction(kibanaTimerangeFunction);
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

    expressions.registerType(esRawResponse);
    expressions.registerType(eqlRawResponse);

    const aggs = this.aggsService.setup({
      registerFunction: expressions.registerFunction,
    });

    void firstValueFrom(this.initializerContext.config.create<ConfigSchema>()).then((value) => {
      if (value.search.aggs.shardDelay.enabled) {
        aggs.types.registerBucket(SHARD_DELAY_AGG_NAME, getShardDelayBucketAgg);
        expressions.registerFunction(aggShardDelay);
      }
    });

    return {
      aggs,
      registerSearchStrategy: this.registerSearchStrategy,
      usage,
      searchSource: this.searchSourceService.setup(),
      enableRollups: () => (this.rollupsEnabled = true),
    };
  }

  public start(
    core: CoreStart,
    { fieldFormats, indexPatterns }: SearchServiceStartDependencies
  ): ISearchStart {
    const { elasticsearch, savedObjects, uiSettings } = core;

    this.sessionService.start(core, {});

    const aggs = this.aggsService.start({
      fieldFormats,
      uiSettings,
      indexPatterns,
    });

    this.asScoped = this.asScopedProvider(core, this.rollupsEnabled);
    return {
      aggs,
      searchAsInternalUser: this.searchAsInternalUser,
      getSearchStrategy: this.getSearchStrategy,
      asScoped: this.asScoped,
      searchSource: {
        asScoped: async (request: KibanaRequest) => {
          const esClient = elasticsearch.client.asScoped(request);
          const savedObjectsClient = savedObjects.getScopedClient(request);
          const scopedIndexPatterns = await indexPatterns.dataViewsServiceFactory(
            savedObjectsClient,
            esClient.asCurrentUser
          );
          const uiSettingsClient = uiSettings.asScopedToClient(savedObjectsClient);
          const aggsStart = await aggs.asScopedToClient(savedObjectsClient, esClient.asCurrentUser);

          // cache ui settings, only including items which are explicitly needed by SearchSource
          const uiSettingsCache = pick(
            await uiSettingsClient.getAll(),
            searchSourceRequiredUiSettings
          );

          const searchSourceDependencies: SearchSourceDependencies = {
            aggs: aggsStart,
            getConfig: <T = any>(key: string): T => uiSettingsCache[key],
            search: this.asScoped(request).search,
            onResponse: (req, res) => res,
            dataViews: scopedIndexPatterns,
            scriptedFieldsEnabled: true,
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
    name: string | symbol,
    strategy: ISearchStrategy<SearchStrategyRequest, SearchStrategyResponse>
  ) => {
    this.logger.debug(`Register strategy ${String(name)}`);
    this.searchStrategies.set(name, strategy);
  };

  private getSearchStrategy = <
    SearchStrategyRequest extends IKibanaSearchRequest = IEsSearchRequest,
    SearchStrategyResponse extends IKibanaSearchResponse = IEsSearchResponse
  >(
    name: string | symbol = ENHANCED_ES_SEARCH_STRATEGY
  ): ISearchStrategy<SearchStrategyRequest, SearchStrategyResponse> => {
    this.logger.debug(`Get strategy ${String(name)}`);
    const strategy = this.searchStrategies.get(name);
    if (!strategy) {
      throw new KbnServerError(`Search strategy ${String(name)} not found`, 404);
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
      let isInternalSearchStored = false; // used to prevent tracking current search more than once
      const search$ = searchRequest$.pipe(
        switchMap((searchRequest) =>
          strategy.search(searchRequest, options, deps).pipe(
            concatMap((response) => {
              response = {
                ...response,
                isRestored: !!searchRequest.id,
              };

              if (
                options.sessionId && // if within search session
                options.isStored && // and search session was saved (saved object exists)
                response.id && // and async search has started
                !(options.isRestore && searchRequest.id) // and not restoring already tracked search
              ) {
                // then track this search inside the search-session saved object

                // check if search was already tracked and extended, don't track again in this case
                if (options.isSearchStored || isInternalSearchStored) {
                  return of({
                    ...response,
                    isStored: true,
                  });
                } else {
                  return from(deps.searchSessionsClient.trackId(response.id, options)).pipe(
                    tap(() => {
                      isInternalSearchStored = true;
                    }),
                    map(() => ({
                      ...response,
                      isStored: true,
                    })),
                    catchError((e) => {
                      this.logger.error(
                        `Error while trying to track search id: ${e?.message}. This might lead to untracked long-running search.`
                      );
                      return of(response);
                    })
                  );
                }
              } else {
                return of(response);
              }
            })
          )
        )
      );

      return search$;
    } catch (e) {
      return throwError(e);
    }
  };

  private cancel = (deps: SearchStrategyDependencies, id: string, options: ISearchOptions = {}) => {
    const strategy = this.getSearchStrategy(options.strategy);
    if (!strategy.cancel) {
      throw new KbnServerError(
        `Search strategy ${String(options.strategy)} doesn't support cancellations`,
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
      throw new KbnServerError(
        `Search strategy ${String(options.strategy)} does not support extend`,
        400
      );
    }
    return strategy.extend(id, keepAlive, options, deps);
  };

  private cancelSessionSearches = async (deps: SearchStrategyDependencies, sessionId: string) => {
    const searchIdMapping = await deps.searchSessionsClient.getSearchIdMapping(sessionId);
    await Promise.allSettled(
      Array.from(searchIdMapping).map(async ([searchId, strategyName]) => {
        const searchOptions = {
          sessionId,
          strategy: strategyName,
          isStored: true,
        };

        try {
          await this.cancel(deps, searchId, searchOptions);
        } catch (e) {
          this.logger.error(`cancelSessionSearches error: ${e.message}`);
        }
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

  private updateSessionStatuses = async (
    deps: SearchStrategyDependencies,
    sessionIds: string[]
  ) => {
    return deps.searchSessionsClient.updateStatuses(sessionIds);
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

  private asScopedProvider = (core: CoreStart, rollupsEnabled: boolean = false) => {
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
        rollupsEnabled,
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
        updateSessionStatuses: this.updateSessionStatuses.bind(this, deps),
        getSessionStatus: searchSessionsClient.status,
      };
    };
  };
}
