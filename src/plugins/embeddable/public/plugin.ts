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
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '../../../core/public';
import { EmbeddableFactoryRegistry } from './types';
import { createApi, EmbeddableApi } from './api';
import { bootstrap } from './bootstrap';

export interface IEmbeddableSetupDependencies {
  uiActions: IUiActionsSetup;
}

export class EmbeddablePublicPlugin implements Plugin<any, any> {
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

  public start(core: CoreStart) {
    return this.api;
  }

  public stop() {}
}

export type Setup = ReturnType<EmbeddablePublicPlugin['setup']>;
export type Start = ReturnType<EmbeddablePublicPlugin['start']>;
