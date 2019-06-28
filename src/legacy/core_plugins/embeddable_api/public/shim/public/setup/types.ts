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
import { Trigger, Action, EmbeddableFactory } from '../lib';

export interface EmbeddableSetupApi {
  registerTrigger: (trigger: Trigger) => void;
  getTrigger: (id: string) => Trigger;
  registerAction: (action: Action) => void;
  registerEmbeddableFactory: (id: string, factory: EmbeddableFactory) => void;
  attachAction: (triggerId: string, actionId: string) => void;
  detachAction: (triggerId: string, actionId: string) => void;
}

export interface EmbeddableSetupDependencies {
  api: EmbeddableSetupApi,
  triggers: TriggerRegistry;
  actions: ActionRegistry;
  embeddableFactories: EmbeddableFactoryRegistry;
}

export type EmbeddableSetupApiPure = {
  [K in keyof EmbeddableSetupApi]: (deps: EmbeddableSetupDependencies) => EmbeddableSetupApi[K];
};
