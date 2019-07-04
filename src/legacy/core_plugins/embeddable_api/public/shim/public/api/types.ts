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
import { Trigger, Action, EmbeddableFactory, ExecuteTriggerActions, GetEmbeddableFactories, TriggerContext } from '../lib';

export interface EmbeddableApi {
  attachAction: (triggerId: string, actionId: string) => void;
  detachAction: (triggerId: string, actionId: string) => void;
  executeTriggerActions: ExecuteTriggerActions;
  getEmbeddableFactory: (embeddableFactoryId: string) => EmbeddableFactory;
  getEmbeddableFactories: GetEmbeddableFactories;
  getTrigger: (id: string) => Trigger;
  getTriggerActions: (id: string) => Action[];
  getTriggerCompatibleActions: (triggerId: string, context: TriggerContext) => Promise<Action[]>;
  registerAction: (action: Action) => void;
  // TODO: Make `registerEmbeddableFactory` receive only `factory` argument.
  registerEmbeddableFactory: (id: string, factory: EmbeddableFactory) => void;
  registerTrigger: (trigger: Trigger) => void;
}

export interface EmbeddableDependencies {
  actions: ActionRegistry;
  embeddableFactories: EmbeddableFactoryRegistry;
  triggers: TriggerRegistry;
}

export interface EmbeddableDependenciesInternal extends EmbeddableDependencies {
  api: Partial<EmbeddableApi>,
}

export type EmbeddableApiPure = {
  [K in keyof EmbeddableApi]: (deps: EmbeddableDependenciesInternal) => EmbeddableApi[K];
};

type OptionalPropertyOf<T extends object> = Exclude<{
  [K in keyof T]: T extends Record<K, T[K]>
    ? never
    : K
}[keyof T], undefined>;

export interface Embeddables {
  api: Readonly<EmbeddableApi>;
  addDependencies: (deps: OptionalPropertyOf<EmbeddableDependencies>) => void;
}
