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
import { ISearchSetup, ISearchStart, TSearchStrategyProvider, TSearchStrategiesMap } from './types';
import { TStrategyTypes } from './strategy_types';
import { getEsClient, LegacyApiCaller } from './es_client';
import { ES_SEARCH_STRATEGY, DEFAULT_SEARCH_STRATEGY } from '../../common/search';
import { esSearchStrategyProvider } from './es_search/es_search_strategy';
import { SearchInterceptor } from './search_interceptor';
import {
  getAggTypes,
  AggType,
  AggTypesRegistry,
  AggConfig,
  AggConfigs,
  FieldParamType,
  getCalculateAutoTimeExpression,
  MetricAggType,
  aggTypeFieldFilters,
  parentPipelineAggHelper,
  siblingPipelineAggHelper,
} from './aggs';

/**
 * The search plugin exposes two registration methods for other plugins:
 *  -  registerSearchStrategyProvider for plugins to add their own custom
 * search strategies
 *  -  registerSearchStrategyContext for plugins to expose information
 * and/or functionality for other search strategies to use
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

  private registerSearchStrategyProvider = <T extends TStrategyTypes>(
    name: T,
    strategyProvider: TSearchStrategyProvider<T>
  ) => {
    this.searchStrategies[name] = strategyProvider;
  };

  private getSearchStrategy = <T extends TStrategyTypes>(name: T): TSearchStrategyProvider<T> => {
    const strategyProvider = this.searchStrategies[name];
    if (!strategyProvider) throw new Error(`Search strategy ${name} not found`);
    return strategyProvider;
  };

  public setup(core: CoreSetup, packageInfo: PackageInfo): ISearchSetup {
    this.esClient = getEsClient(core.injectedMetadata, core.http, packageInfo);
    this.registerSearchStrategyProvider(SYNC_SEARCH_STRATEGY, syncSearchStrategyProvider);
    this.registerSearchStrategyProvider(ES_SEARCH_STRATEGY, esSearchStrategyProvider);

    const aggTypesSetup = this.aggTypesRegistry.setup();
    const aggTypes = getAggTypes({ uiSettings: core.uiSettings });
    aggTypes.buckets.forEach((b) => aggTypesSetup.registerBucket(b));
    aggTypes.metrics.forEach((m) => aggTypesSetup.registerMetric(m));

    return {
      aggs: {
        calculateAutoTimeExpression: getCalculateAutoTimeExpression(core.uiSettings),
        types: aggTypesSetup,
      },
      registerSearchStrategyProvider: this.registerSearchStrategyProvider,
    };
  }

  public start(core: CoreStart): ISearchStart {
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
      search: (request, options, strategyName) => {
        const strategyProvider = this.getSearchStrategy(strategyName || DEFAULT_SEARCH_STRATEGY);
        const { search } = strategyProvider({
          core,
          getSearchStrategy: this.getSearchStrategy,
        });
        return this.searchInterceptor.search(search as any, request, options);
      },
      setInterceptor: (searchInterceptor: SearchInterceptor) => {
        // TODO: should an intercepror have a destroy method?
        this.searchInterceptor = searchInterceptor;
      },
      __LEGACY: {
        esClient: this.esClient!,
        AggConfig,
        AggType,
        aggTypeFieldFilters,
        FieldParamType,
        MetricAggType,
        parentPipelineAggHelper,
        siblingPipelineAggHelper,
      },
    };
  }

  public stop() {}
}
