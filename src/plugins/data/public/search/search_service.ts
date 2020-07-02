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

import { Plugin, CoreSetup, CoreStart, PackageInfo } from '../../../../core/public';
import { SYNC_SEARCH_STRATEGY, syncSearchStrategyProvider } from './sync_search_strategy';
import { ISearchSetup, ISearchStart, TSearchStrategiesMap, ISearchStrategy } from './types';
import { ExpressionsSetup } from '../../../../plugins/expressions/public';

import { createSearchSource, SearchSource, SearchSourceDependencies } from './search_source';
import { TStrategyTypes } from './strategy_types';
import { getEsClient, LegacyApiCaller } from './legacy';
import { getForceNow } from '../query/timefilter/lib/get_force_now';
import { calculateBounds, TimeRange } from '../../common/query';
import { ES_SEARCH_STRATEGY, DEFAULT_SEARCH_STRATEGY } from '../../common/search';
import { esSearchStrategyProvider } from './es_search';
import { IndexPatternsContract } from '../index_patterns/index_patterns';
import { GetInternalStartServicesFn } from '../types';
import { SearchInterceptor } from './search_interceptor';
import {
  getAggTypes,
  getAggTypesFunctions,
  AggTypesRegistry,
  AggConfigs,
  getCalculateAutoTimeExpression,
} from './aggs';
import { ISearchGeneric } from './i_search';

interface SearchServiceSetupDependencies {
  expressions: ExpressionsSetup;
  getInternalStartServices: GetInternalStartServicesFn;
  packageInfo: PackageInfo;
}

interface SearchServiceStartDependencies {
  indexPatterns: IndexPatternsContract;
}

/**
 * The search plugin exposes a method `registerSearchStrategy` for other plugins
 * to add their own custom search strategies.
 *
 * It also comes with two search strategy implementations - SYNC_SEARCH_STRATEGY and ES_SEARCH_STRATEGY.
 */
export class SearchService implements Plugin<ISearchSetup, ISearchStart> {
  /**
   * A mapping of search strategies keyed by a unique identifier.  Plugins can use this unique identifier
   * to override certain strategy implementations.
   */
  private searchStrategies: TSearchStrategiesMap = {};

  private esClient?: LegacyApiCaller;
  private readonly aggTypesRegistry = new AggTypesRegistry();
  private searchInterceptor!: SearchInterceptor;

  private registerSearchStrategy = <T extends TStrategyTypes>(
    name: T,
    strategy: ISearchStrategy<T>
  ) => {
    this.searchStrategies[name] = strategy;
  };

  private getSearchStrategy = <T extends TStrategyTypes>(name: T): ISearchStrategy<T> => {
    const strategy = this.searchStrategies[name];
    if (!strategy) {
      throw new Error(`Search strategy ${name} not found`);
    }
    return strategy;
  };

  /**
   * getForceNow uses window.location, so we must have a separate implementation
   * of calculateBounds on the client and the server.
   */
  private calculateBounds = (timeRange: TimeRange) =>
    calculateBounds(timeRange, { forceNow: getForceNow() });

  public setup(
    core: CoreSetup,
    { expressions, packageInfo, getInternalStartServices }: SearchServiceSetupDependencies
  ): ISearchSetup {
    this.esClient = getEsClient(core.injectedMetadata, core.http, packageInfo);

    const syncSearchStrategy = syncSearchStrategyProvider(core);
    const esSearchStrategy = esSearchStrategyProvider(core, syncSearchStrategy);
    this.registerSearchStrategy(SYNC_SEARCH_STRATEGY, syncSearchStrategy);
    this.registerSearchStrategy(ES_SEARCH_STRATEGY, esSearchStrategy);

    const aggTypesSetup = this.aggTypesRegistry.setup();

    // register each agg type
    const aggTypes = getAggTypes({
      calculateBounds: this.calculateBounds,
      getInternalStartServices,
      uiSettings: core.uiSettings,
    });
    aggTypes.buckets.forEach((b) => aggTypesSetup.registerBucket(b));
    aggTypes.metrics.forEach((m) => aggTypesSetup.registerMetric(m));

    // register expression functions for each agg type
    const aggFunctions = getAggTypesFunctions();
    aggFunctions.forEach((fn) => expressions.registerFunction(fn));

    return {
      aggs: {
        calculateAutoTimeExpression: getCalculateAutoTimeExpression(core.uiSettings),
        types: aggTypesSetup,
      },
      registerSearchStrategy: this.registerSearchStrategy,
    };
  }

  public start(core: CoreStart, dependencies: SearchServiceStartDependencies): ISearchStart {
    /**
     * A global object that intercepts all searches and provides convenience methods for cancelling
     * all pending search requests, as well as getting the number of pending search requests.
     * TODO: Make this modular so that apps can opt in/out of search collection, or even provide
     * their own search collector instances
     */
    this.searchInterceptor = new SearchInterceptor(
      core.notifications.toasts,
      core.application,
      core.injectedMetadata.getInjectedVar('esRequestTimeout') as number
    );

    const aggTypesStart = this.aggTypesRegistry.start();

    const search: ISearchGeneric = (request, options, strategyName) => {
      const { search: defaultSearch } = this.getSearchStrategy(
        strategyName || DEFAULT_SEARCH_STRATEGY
      );
      return this.searchInterceptor.search(defaultSearch as any, request, options);
    };

    const legacySearch = {
      esClient: this.esClient!,
    };

    const searchSourceDependencies: SearchSourceDependencies = {
      uiSettings: core.uiSettings,
      injectedMetadata: core.injectedMetadata,
      search,
      legacySearch,
    };

    return {
      aggs: {
        calculateAutoTimeExpression: getCalculateAutoTimeExpression(core.uiSettings),
        createAggConfigs: (indexPattern, configStates = [], schemas) => {
          return new AggConfigs(indexPattern, configStates, {
            typesRegistry: aggTypesStart,
          });
        },
        types: aggTypesStart,
      },
      getSearchStrategy: this.getSearchStrategy,
      search,
      searchSource: {
        create: createSearchSource(dependencies.indexPatterns, searchSourceDependencies),
        createEmpty: () => {
          return new SearchSource({}, searchSourceDependencies);
        },
      },
      setInterceptor: (searchInterceptor: SearchInterceptor) => {
        // TODO: should an intercepror have a destroy method?
        this.searchInterceptor = searchInterceptor;
      },
      __LEGACY: legacySearch,
    };
  }

  public stop() {}
}
