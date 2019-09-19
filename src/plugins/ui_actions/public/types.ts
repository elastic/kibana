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

import { IAction } from './actions/i_action';
import { ITrigger } from './triggers/i_trigger';

export { IAction } from './actions';
export { ITrigger } from './triggers/i_trigger';

export type TExecuteTriggerActions = <A>(triggerId: string, actionContext: A) => Promise<void>;

export type TGetActionsCompatibleWithTrigger = <C>(
  triggerId: string,
  context: C
) => Promise<IAction[]>;

export interface IUiActionsApi {
  attachAction: (triggerId: string, actionId: string) => void;
  detachAction: (triggerId: string, actionId: string) => void;
  executeTriggerActions: TExecuteTriggerActions;
  getTrigger: (id: string) => ITrigger;
  getTriggerActions: (id: string) => IAction[];
  getTriggerCompatibleActions: <C>(triggerId: string, context: C) => Promise<Array<IAction<C>>>;
  registerAction: (action: IAction) => void;
  registerTrigger: (trigger: ITrigger) => void;
}

export interface IUiActionsDependencies {
  actions: IActionRegistry;
  triggers: ITriggerRegistry;
}

export interface IUiActionsDependenciesInternal extends IUiActionsDependencies {
  api: Readonly<Partial<IUiActionsApi>>;
}

export type IUiActionsApiPure = {
  [K in keyof IUiActionsApi]: (deps: IUiActionsDependenciesInternal) => IUiActionsApi[K];
};

export type ITriggerRegistry = Map<string, ITrigger>;
export type IActionRegistry = Map<string, IAction>;
