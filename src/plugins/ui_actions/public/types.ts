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

import { Action } from './actions/action';
import { Trigger } from './triggers/trigger';

export { Action } from './actions';
export { Trigger } from './triggers/trigger';

export type ExecuteTriggerActions = <A>(triggerId: string, actionContext: A) => Promise<void>;

export type GetActionsCompatibleWithTrigger = <C>(
  triggerId: string,
  context: C
) => Promise<Action[]>;

export interface UiActionsApi {
  attachAction: (triggerId: string, actionId: string) => void;
  detachAction: (triggerId: string, actionId: string) => void;
  executeTriggerActions: ExecuteTriggerActions;
  getTrigger: (id: string) => Trigger;
  getTriggerActions: (id: string) => Action[];
  getTriggerCompatibleActions: <C>(triggerId: string, context: C) => Promise<Array<Action<C>>>;
  registerAction: (action: Action) => void;
  registerTrigger: (trigger: Trigger) => void;
}

export interface UiActionsDependencies {
  actions: ActionRegistry;
  triggers: TriggerRegistry;
}

export interface UiActionsDependenciesInternal extends UiActionsDependencies {
  api: Readonly<Partial<UiActionsApi>>;
}

export type UiActionsApiPure = {
  [K in keyof UiActionsApi]: (deps: UiActionsDependenciesInternal) => UiActionsApi[K];
};

export type TriggerRegistry = Map<string, Trigger>;
export type ActionRegistry = Map<string, Action>;
