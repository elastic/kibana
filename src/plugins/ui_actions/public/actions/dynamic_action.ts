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

import { UiComponent } from 'src/plugins/kibana_utils/common';
import { Action } from './action';

/**
 * A dynamic action is one that can be create by user and registered into the
 * actions registry at runtime. User can also provide custom config for this
 * action. And dynamic actions can be serialized for storage and deserialized back.
 */
export interface DynamicAction<
  Config extends object = object,
  Context extends object = object,
  Return = Promise<void>
> extends Action<Context, Return> {
  /**
   * ID of the `FactoryAction` that can be used to construct instances of
   * this dynamic action.
   */
  readonly factoryId: string;

  /**
   * Default config for this action, used when action is created for the first time.
   */
  readonly defaultConfig: Config;

  /**
   * `UiComponent` to be rendered when collecting configuration for this dynamic action.
   */
  readonly CollectConfig?: UiComponent<CollectConfigProps<Context, Config>>;
}

/**
 * Props provided to `CollectConfig` component on every re-render.
 */
export interface CollectConfigProps<Context, Config> {
  /**
   * Context which represents environment where component is being rendered.
   */
  context: Context;

  /**
   * Current config of the dynamic action.
   */
  config: Config;

  /**
   * Callback called when user updates the config in UI.
   */
  onConfig: (config: Config) => void;
}

export type DynamicActionConfig<T> = T extends DynamicAction<infer Config, any, any>
  ? Config
  : never;
