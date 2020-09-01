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

import {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
  RequestHandlerContext,
} from '../../../../core/server';
import { ISearchSetup, ISearchStart, ISearchStrategy, SearchEnhancements } from './types';

import { AggsService, AggsSetupDependencies } from './aggs';

import { FieldFormatsStart } from '../field_formats';
import { registerSearchRoute } from './routes';
import { ES_SEARCH_STRATEGY, esSearchStrategyProvider } from './es_search';
import { DataPluginStart } from '../plugin';
import { UsageCollectionSetup } from '../../../usage_collection/server';
import { registerUsageCollector } from './collectors/register';
import { usageProvider } from './collectors/usage';
import { searchTelemetry } from '../saved_objects';
import { IEsSearchRequest, IEsSearchResponse } from '../../common';

type StrategyMap<
  SearchStrategyRequest extends IEsSearchRequest = IEsSearchRequest,
  SearchStrategyResponse extends IEsSearchResponse = IEsSearchResponse
> = Record<string, ISearchStrategy<SearchStrategyRequest, SearchStrategyResponse>>;

/** @internal */
export interface SearchServiceSetupDependencies {
  registerFunction: AggsSetupDependencies['registerFunction'];
  usageCollection?: UsageCollectionSetup;
}

/** @internal */
export interface SearchServiceStartDependencies {
  fieldFormats: FieldFormatsStart;
}

export class SearchService implements Plugin<ISearchSetup, ISearchStart> {
  private readonly aggsService = new AggsService();
  private defaultSearchStrategyName: string = ES_SEARCH_STRATEGY;
  private searchStrategies: StrategyMap<any, any> = {};

  constructor(
    private initializerContext: PluginInitializerContext,
    private readonly logger: Logger
  ) {}

  public setup(
    core: CoreSetup<object, DataPluginStart>,
    { registerFunction, usageCollection }: SearchServiceSetupDependencies
  ): ISearchSetup {
    const usage = usageCollection ? usageProvider(core) : undefined;

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

    registerSearchRoute(core);

    return {
      __enhance: (enhancements: SearchEnhancements) => {
        if (this.searchStrategies.hasOwnProperty(enhancements.defaultStrategy)) {
          this.defaultSearchStrategyName = enhancements.defaultStrategy;
        }
      },
      aggs: this.aggsService.setup({ registerFunction }),
      registerSearchStrategy: this.registerSearchStrategy,
      usage,
    };
  }

  private search(
    context: RequestHandlerContext,
    searchRequest: IEsSearchRequest,
    options: Record<string, any>
  ) {
    return this.getSearchStrategy(
      options.strategy || this.defaultSearchStrategyName
    ).search(context, searchRequest, { signal: options.signal });
  }

  public start(
    { uiSettings }: CoreStart,
    { fieldFormats }: SearchServiceStartDependencies
  ): ISearchStart {
    return {
      aggs: this.aggsService.start({ fieldFormats, uiSettings }),
      getSearchStrategy: this.getSearchStrategy,
      search: (
        context: RequestHandlerContext,
        searchRequest: IEsSearchRequest,
        options: Record<string, any>
      ) => {
        return this.search(context, searchRequest, options);
      },
    };
  }

  public stop() {
    this.aggsService.stop();
  }

  private registerSearchStrategy = <
    SearchStrategyRequest extends IEsSearchRequest = IEsSearchRequest,
    SearchStrategyResponse extends IEsSearchResponse = IEsSearchResponse
  >(
    name: string,
    strategy: ISearchStrategy<SearchStrategyRequest, SearchStrategyResponse>
  ) => {
    this.logger.debug(`Register strategy ${name}`);
    this.searchStrategies[name] = strategy;
  };

  private getSearchStrategy = (name: string): ISearchStrategy => {
    this.logger.debug(`Get strategy ${name}`);
    const strategy = this.searchStrategies[name];
    if (!strategy) {
      throw new Error(`Search strategy ${name} not found`);
    }
    return strategy;
  };
}
