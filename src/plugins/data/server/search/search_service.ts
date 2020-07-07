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

import { Plugin, PluginInitializerContext, CoreSetup } from '../../../../core/server';
import {
  ISearchSetup,
  ISearchStart,
  TSearchStrategiesMap,
  TRegisterSearchStrategy,
  TGetSearchStrategy,
} from './types';
import { registerSearchRoute } from './routes';
import { ES_SEARCH_STRATEGY, esSearchStrategyProvider } from './es_search';
import { DataPluginStart } from '../plugin';

export class SearchService implements Plugin<ISearchSetup, ISearchStart> {
  private searchStrategies: TSearchStrategiesMap = {};

  constructor(private initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup<object, DataPluginStart>): ISearchSetup {
    this.registerSearchStrategy(
      ES_SEARCH_STRATEGY,
      esSearchStrategyProvider(this.initializerContext.config.legacy.globalConfig$)
    );

    registerSearchRoute(core);

    return { registerSearchStrategy: this.registerSearchStrategy };
  }

  public start(): ISearchStart {
    return { getSearchStrategy: this.getSearchStrategy };
  }

  public stop() {}

  private registerSearchStrategy: TRegisterSearchStrategy = (name, strategy) => {
    this.searchStrategies[name] = strategy;
  };

  private getSearchStrategy: TGetSearchStrategy = (name) => {
    const strategy = this.searchStrategies[name];
    if (!strategy) {
      throw new Error(`Search strategy ${name} not found`);
    }
    return strategy;
  };
}
