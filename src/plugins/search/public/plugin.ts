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
  CoreSetup,
  PluginInitializerContext,
  CoreStart,
  IContextContainer,
  PluginOpaqueId,
} from '../../../core/public';

import { ISearchAppMountContext } from './i_search_app_mount_context';
import {
  TClientSearchStrategyProvider,
  IClientSearchStrategy,
  ISearchSetup,
} from './i_setup_contract';
import { createAppMountSearchContext } from './create_app_mount_context_search';
import { syncSearchStrategyProvider } from './sync_search_strategy';
import { ISearchContext } from './i_search_context';

export interface KibanaSearchResponse<THits> {
  percentComplete: number;

  hits: THits[];
}

declare module 'kibana/public' {
  interface AppMountContext {
    search: ISearchAppMountContext;
  }
}

export const SYNC_SEARCH_STRATEGY = 'sync';

export class SearchPublicPlugin implements Plugin<ISearchSetup, void> {
  private clientSearchStrategies = new Map<
    string,
    () => Promise<IClientSearchStrategy<any, any>>
  >();

  private defaultClientSearchStrategyName: string = SYNC_SEARCH_STRATEGY;

  private contextContainer?: IContextContainer<ISearchContext, IClientSearchStrategy<any, any>>;

  constructor(private initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup): ISearchSetup {
    this.contextContainer = core.context.createContextContainer<
      ISearchContext,
      IClientSearchStrategy<any, any>
    >();

    this.contextContainer!.registerContext(this.initializerContext.opaqueId, 'core', () => core);

    core.application.registerMountContext<'search'>('search', context => {
      const { search, getClientSearchStrategy } = createAppMountSearchContext({
        clientSearchStrategies: this.clientSearchStrategies,
        defaultClientSearchStrategy: this.defaultClientSearchStrategyName,
      });

      const appMountApi = {
        getClientSearchStrategy,
        search,
      };

      this.contextContainer!.registerContext(
        this.initializerContext.opaqueId,
        'search',
        () => appMountApi
      );

      return appMountApi;
    });

    const api = {
      registerSearchStrategyContext: this.contextContainer!.registerContext,
      registerClientSearchStrategyProvider: (
        plugin: PluginOpaqueId,
        name: string,
        strategyProvider: TClientSearchStrategyProvider<any, any>
      ) => {
        this.clientSearchStrategies.set(
          name,
          this.contextContainer!.createHandler(plugin, strategyProvider)
        );
      },
    };

    api.registerClientSearchStrategyProvider(
      this.initializerContext.opaqueId,
      SYNC_SEARCH_STRATEGY,
      syncSearchStrategyProvider
    );

    return api;
  }

  public start(core: CoreStart) {}
  public stop() {}
}
