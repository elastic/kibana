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
import { BehaviorSubject } from 'rxjs';
import {
  Plugin,
  CoreSetup,
  PluginInitializerContext,
  CoreStart,
  IContextContainer,
  PluginOpaqueId,
} from '../../../../core/public';

import { ISearchAppMountContext } from './i_search_app_mount_context';
import { ISearchSetup } from './i_search_setup';
import { createAppMountSearchContext } from './create_app_mount_context_search';
import { SYNC_SEARCH_STRATEGY, syncSearchStrategyProvider } from './sync_search_strategy';
import {
  TSearchStrategyProvider,
  TRegisterSearchStrategyProvider,
  TSearchStrategiesMap,
} from './i_search_strategy';
import { TStrategyTypes } from './strategy_types';
import { esSearchService } from './es_search';
import { ISearchGeneric } from './i_search';

/**
 * Extends the AppMountContext so other plugins have access
 * to search functionality in their applications.
 */
declare module 'kibana/public' {
  interface AppMountContext {
    search?: ISearchAppMountContext;
  }
}

export interface ISearchStart {
  search: ISearchGeneric;
}

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

  /**
   * Exposes context to the search strategies.
   */
  private contextContainer?: IContextContainer<TSearchStrategyProvider<any>>;

  private search?: ISearchGeneric;
  private readonly loadingCount$ = new BehaviorSubject(0);

  constructor(private initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup): ISearchSetup {
    core.http.addLoadingCountSource(this.loadingCount$);
    const search = (this.search = createAppMountSearchContext(
      this.searchStrategies,
      this.loadingCount$
    ).search);
    core.application.registerMountContext<'search'>('search', () => {
      return { search };
    });

    this.contextContainer = core.context.createContextContainer();

    const registerSearchStrategyProvider: TRegisterSearchStrategyProvider = <
      T extends TStrategyTypes
    >(
      plugin: PluginOpaqueId,
      name: T,
      strategyProvider: TSearchStrategyProvider<T>
    ) => {
      this.searchStrategies[name] = this.contextContainer!.createHandler(plugin, strategyProvider);
    };

    const api = {
      registerSearchStrategyContext: this.contextContainer!.registerContext,
      registerSearchStrategyProvider,
    };

    api.registerSearchStrategyContext(this.initializerContext.opaqueId, 'core', () => core);
    api.registerSearchStrategyProvider(
      this.initializerContext.opaqueId,
      SYNC_SEARCH_STRATEGY,
      syncSearchStrategyProvider
    );

    // ES search capabilities are written in a way that it could easily be a separate plugin,
    // however these two plugins are tightly coupled due to the default search strategy using
    // es search types.
    esSearchService(this.initializerContext).setup(core, { search: api });

    return api;
  }

  public start(core: CoreStart) {
    if (!this.search) {
      throw new Error('Search should always be defined');
    }
    return { search: this.search };
  }

  public stop() {}
}
