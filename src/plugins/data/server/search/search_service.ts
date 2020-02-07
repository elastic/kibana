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
  PluginInitializerContext,
  Plugin,
  CoreSetup,
  IContextContainer,
} from '../../../../core/server';
import { registerSearchRoute } from './routes';
import { ISearchSetup } from './i_search_setup';
import { createApi } from './create_api';
import {
  TSearchStrategiesMap,
  TSearchStrategyProvider,
  TRegisterSearchStrategyProvider,
} from './i_search_strategy';
import { IRouteHandlerSearchContext } from './i_route_handler_search_context';
import { esSearchService } from './es_search';

declare module 'kibana/server' {
  interface RequestHandlerContext {
    search?: IRouteHandlerSearchContext;
  }
}

export class SearchService implements Plugin<ISearchSetup, void> {
  private searchStrategies: TSearchStrategiesMap = {};

  private contextContainer?: IContextContainer<TSearchStrategyProvider<any>>;

  constructor(private initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup): ISearchSetup {
    const router = core.http.createRouter();
    registerSearchRoute(router);

    this.contextContainer = core.context.createContextContainer();

    core.http.registerRouteHandlerContext<'search'>('search', context => {
      return createApi({
        caller: context.core!.elasticsearch.dataClient.callAsCurrentUser,
        searchStrategies: this.searchStrategies,
      });
    });

    const registerSearchStrategyProvider: TRegisterSearchStrategyProvider = (
      plugin,
      name,
      strategyProvider
    ) => {
      this.searchStrategies[name] = this.contextContainer!.createHandler(plugin, strategyProvider);
    };

    const api: ISearchSetup = {
      registerSearchStrategyContext: this.contextContainer!.registerContext,
      registerSearchStrategyProvider,
      __LEGACY: {
        search: (caller, request, strategyName) => {
          const searchAPI = createApi({
            caller,
            searchStrategies: this.searchStrategies,
          });
          return searchAPI.search(request, {}, strategyName);
        },
      },
    };

    api.registerSearchStrategyContext(this.initializerContext.opaqueId, 'core', () => core);
    api.registerSearchStrategyContext(
      this.initializerContext.opaqueId,
      'config$',
      () => this.initializerContext.config.legacy.globalConfig$
    );

    // ES search capabilities are written in a way that it could easily be a separate plugin,
    // however these two plugins are tightly coupled due to the default search strategy using
    // es search types.
    esSearchService(this.initializerContext).setup(core, { search: api });

    return api;
  }

  public start() {}
  public stop() {}
}
