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
  CoreSetup,
  CoreStart,
  Plugin,
} from '../../../../../../core/public';
import { TriggerRegistry, ActionRegistry, EmbeddableFactoryRegistry } from './types';
import { createApi, EmbeddableApi } from './api';
import { bootstrap } from './bootstrap';

export class EmbeddablePublicPlugin implements Plugin<any, any> {
  private readonly triggers: TriggerRegistry = new Map();
  private readonly actions: ActionRegistry = new Map();
  private readonly embeddableFactories: EmbeddableFactoryRegistry = new Map();
  private api!: EmbeddableApi;

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    ({ api: this.api } = createApi({
      actions: this.actions,
      embeddableFactories: this.embeddableFactories,
      triggers: this.triggers,
    }));
    bootstrap(this.api);

    const { registerTrigger, registerAction, registerEmbeddableFactory, attachAction } = this.api;

    return {
      registerTrigger,
      registerAction,
      registerEmbeddableFactory,
      attachAction,
    };
  }

  public start(core: CoreStart) {
    return this.api;
  }

  public stop() {}
}

export type Setup = ReturnType<EmbeddablePublicPlugin['setup']>;
export type Start = ReturnType<EmbeddablePublicPlugin['start']>;
