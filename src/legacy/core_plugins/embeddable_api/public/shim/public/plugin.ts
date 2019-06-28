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

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'kibana/public';
import { TriggerRegistry, ActionRegistry, EmbeddableFactoryRegistry } from './types';
import { EmbeddableSetupApi, registerTrigger, registerAction, registerEmbeddableFactory, attachAction, detachAction } from './setup';

export class EmbeddablePublicPlugin implements Plugin<EmbeddableSetupApi, void> {
  private readonly triggers: TriggerRegistry = new Map();
  private readonly actions: ActionRegistry = new Map();
  private readonly embeddableFactories: EmbeddableFactoryRegistry = new Map();

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    const deps = {
      triggers: this.triggers,
      actions: this.actions,
      embeddableFactories: this.embeddableFactories,
    };
    return {
      registerTrigger: registerTrigger(deps),
      registerAction: registerAction(deps),
      registerEmbeddableFactory: registerEmbeddableFactory(deps),
      attachAction: attachAction(deps),
      detachAction: detachAction(deps),
    };
  }

  public start(core: CoreStart) {}
  public stop() {}
}
