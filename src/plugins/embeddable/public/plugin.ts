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

import { IUiActionsSetup } from 'src/plugins/ui_actions/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '../../../core/public';
import { EmbeddableFactoryRegistry } from './types';
import { createApi, EmbeddableApi } from './api';
import { bootstrap } from './bootstrap';
import { getBoundGetEmbeddableFactory } from './lib/embeddables/embeddable_factory';

export interface IEmbeddableSetupDependencies {
  uiActions: IUiActionsSetup;
}

export interface IEmbeddableSetup {
  registerEmbeddableFactory: EmbeddableApi['registerEmbeddableFactory'];
}

export type IEmbeddableStart = EmbeddableApi;

interface StartDeps {
  data: DataPublicPluginStart;
}

export class EmbeddablePublicPlugin implements Plugin<IEmbeddableSetup, IEmbeddableStart> {
  private readonly embeddableFactories: EmbeddableFactoryRegistry = new Map();
  private api!: EmbeddableApi;

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { uiActions }: IEmbeddableSetupDependencies) {
    ({ api: this.api } = createApi({
      embeddableFactories: this.embeddableFactories,
    }));
    bootstrap(uiActions);

    const { registerEmbeddableFactory } = this.api;

    return {
      registerEmbeddableFactory,
    };
  }

  public start(core: CoreStart, deps: StartDeps) {
    return {
      ...this.api,
      getEmbeddableFactory: getBoundGetEmbeddableFactory({
        createSearchCollector: deps.data.search.createSearchCollector,
        embeddableFactories: this.embeddableFactories,
      }),
    };
  }

  public stop() {}
}
