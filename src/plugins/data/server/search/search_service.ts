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
  Plugin,
  PluginInitializerContext,
  CoreSetup,
  RequestHandlerContext,
  Logger,
} from '../../../../core/server';
import { ISearchSetup, ISearchStart, ISearchStrategy } from './types';
import { registerSearchRoute } from './routes';
import { ES_SEARCH_STRATEGY, esSearchStrategyProvider } from './es_search';
import { DataPluginStart } from '../plugin';
import { UsageCollectionSetup } from '../../../usage_collection/server';
import { registerUsageCollector } from './collectors/register';
import { usageProvider } from './collectors/usage';
import { searchTelemetry } from '../saved_objects';
import { IEsSearchRequest } from '../../common';

interface StrategyMap {
  [name: string]: ISearchStrategy;
}

export class SearchService implements Plugin<ISearchSetup, ISearchStart> {
  private searchStrategies: StrategyMap = {};

  constructor(
    private initializerContext: PluginInitializerContext,
    private readonly logger: Logger
  ) {}

  public setup(
    core: CoreSetup<object, DataPluginStart>,
    { usageCollection }: { usageCollection?: UsageCollectionSetup }
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

    return { registerSearchStrategy: this.registerSearchStrategy, usage };
  }

  private search(
    context: RequestHandlerContext,
    searchRequest: IEsSearchRequest,
    options: Record<string, any>
  ) {
    return this.getSearchStrategy(options.strategy || ES_SEARCH_STRATEGY).search(
      context,
      searchRequest,
      { signal: options.signal }
    );
  }

  public start(): ISearchStart {
    return {
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

  public stop() {}

  private registerSearchStrategy = (name: string, strategy: ISearchStrategy) => {
    this.logger.info(`Register strategy ${name}`);
    this.searchStrategies[name] = strategy;
  };

  private getSearchStrategy = (name: string): ISearchStrategy => {
    this.logger.info(`Get strategy ${name}`);
    const strategy = this.searchStrategies[name];
    if (!strategy) {
      throw new Error(`Search strategy ${name} not found`);
    }
    return strategy;
  };
}
