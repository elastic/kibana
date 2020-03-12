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

import { ActionDefinition } from './action';
import { Presentable, Configurable } from '../util';
import { SerializedAction } from './types';

/**
 * This is a convenience interface for registering new action factories.
 */
export interface ActionFactoryDefinition<
  Config extends object = object,
  FactoryContext extends object = object,
  ActionContext extends object = object
> extends Partial<Presentable<FactoryContext>>, Configurable<Config> {
  /**
   * Unique ID of the action factory. This ID is used to identify this action
   * factory in the registry as well as to construct actions of this ID and
   * identify this action factory when presenting it to the user in UI.
   */
  id: string;

  // todo: add `icon` field here

  /**
   * This method should return a definition of a new action, normally used to
   * register it in `ui_actions` registry.
   */
  create(
    serializedAction: Omit<SerializedAction<Config>, 'factoryId'>
  ): ActionDefinition<ActionContext>;
}

export type AnyActionFactoryDefinition = ActionFactoryDefinition<any, any, any>;

export type AFDConfig<T> = T extends ActionFactoryDefinition<infer Config, any, any>
  ? Config
  : never;

export type AFDFactoryContext<T> = T extends ActionFactoryDefinition<any, infer FactoryContext, any>
  ? FactoryContext
  : never;

export type AFDActionContext<T> = T extends ActionFactoryDefinition<any, any, infer ActionContext>
  ? ActionContext
  : never;
