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
import { ISearchSetup, ISearchStart } from './types';
import { ExpressionsSetup } from '../../../../plugins/expressions/public';

import { createSearchSource, SearchSource, SearchSourceDependencies } from './search_source';
import { getEsClient, LegacyApiCaller } from './legacy';
import { getForceNow } from '../query/timefilter/lib/get_force_now';
import { calculateBounds, TimeRange } from '../../common/query';

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
import { ISearchGeneric } from './types';
import { SearchUsageCollector, createUsageCollector } from './collectors';
import { UsageCollectionSetup } from '../../../usage_collection/public';

interface SearchServiceSetupDependencies {
  expressions: ExpressionsSetup;
  usageCollection?: UsageCollectionSetup;
  getInternalStartServices: GetInternalStartServicesFn;
  packageInfo: PackageInfo;
}

interface SearchServiceStartDependencies {
  indexPatterns: IndexPatternsContract;
}

export class SearchService implements Plugin<ISearchSetup, ISearchStart> {
  private esClient?: LegacyApiCaller;
  private readonly aggTypesRegistry = new AggTypesRegistry();
  private searchInterceptor!: SearchInterceptor;
  private usageCollector?: SearchUsageCollector;

  /**
   * getForceNow uses window.location, so we must have a separate implementation
   * of calculateBounds on the client and the server.
   */
  private calculateBounds = (timeRange: TimeRange) =>
    calculateBounds(timeRange, { forceNow: getForceNow() });

  public setup(
    core: CoreSetup,
    {
      expressions,
      usageCollection,
      packageInfo,
      getInternalStartServices,
    }: SearchServiceSetupDependencies
  ): ISearchSetup {
    this.usageCollector = createUsageCollector(core, usageCollection);
    this.esClient = getEsClient(core.injectedMetadata, core.http, packageInfo);

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
      {
        toasts: core.notifications.toasts,
        application: core.application,
        http: core.http,
        uiSettings: core.uiSettings,
        usageCollector: this.usageCollector!,
      },
      core.injectedMetadata.getInjectedVar('esRequestTimeout') as number
    );

    const aggTypesStart = this.aggTypesRegistry.start();

    const search: ISearchGeneric = (request, options) => {
      return this.searchInterceptor.search(request, options);
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
      search,
      usageCollector: this.usageCollector!,
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
