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
  IUiActionsApi,
  IUiActionsDependenciesInternal,
  IUiActionsDependencies,
  IUiActionsApiPure,
} from './types';
import { attachAction } from './triggers/attach_action';
import { detachAction } from './triggers/detach_action';
import { executeTriggerActions } from './triggers/execute_trigger_actions';
import { getTrigger } from './triggers/get_trigger';
import { getTriggerActions } from './triggers/get_trigger_actions';
import { getTriggerCompatibleActions } from './triggers/get_trigger_compatible_actions';
import { registerAction } from './actions/register_action';
import { registerTrigger } from './triggers/register_trigger';

export const pureApi: IUiActionsApiPure = {
  attachAction,
  detachAction,
  executeTriggerActions,
  getTrigger,
  getTriggerActions,
  getTriggerCompatibleActions,
  registerAction,
  registerTrigger,
};

export const createApi = (deps: IUiActionsDependencies) => {
  const partialApi: Partial<IUiActionsApi> = {};
  const depsInternal: IUiActionsDependenciesInternal = { ...deps, api: partialApi };
  for (const [key, fn] of Object.entries(pureApi)) {
    (partialApi as any)[key] = fn(depsInternal);
  }
  Object.freeze(partialApi);
  const api = partialApi as IUiActionsApi;
  return { api, depsInternal };
};
