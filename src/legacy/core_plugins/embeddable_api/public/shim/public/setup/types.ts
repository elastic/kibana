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

import { TriggerRegistry, ActionRegistry, EmbeddableFactoryRegistry } from '../types';
import { Trigger, Action, EmbeddableFactory, TriggerContext, ExecuteTriggerActions, GetEmbeddableFactories } from '../lib';

export interface EmbeddableSetupApi {
  attachAction: (triggerId: string, actionId: string) => void;
  detachAction: (triggerId: string, actionId: string) => void;
  executeTriggerActions: ExecuteTriggerActions;
  getEmbeddableFactories: GetEmbeddableFactories;
  getTrigger: (id: string) => Trigger;
  getTriggerActions: (id: string) => Action[];
  getTriggerCompatibleActions: (triggerId: string, context: TriggerContext) => Promise<Action[]>;
  registerAction: (action: Action) => void;
  registerEmbeddableFactory: (id: string, factory: EmbeddableFactory) => void;
  registerTrigger: (trigger: Trigger) => void;
}

export interface EmbeddableSetupDependencies {
  actions: ActionRegistry;
  api: () => EmbeddableSetupApi,
  embeddableFactories: EmbeddableFactoryRegistry;
  triggers: TriggerRegistry;
}

export type EmbeddableSetupApiPure = {
  [K in keyof EmbeddableSetupApi]: (deps: EmbeddableSetupDependencies) => EmbeddableSetupApi[K];
};
