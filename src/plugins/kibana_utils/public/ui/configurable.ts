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

import { UiComponent } from '../../common/ui/ui_component';

/**
 * Represents something that can be configured by user using UI.
 */
export interface Configurable<Config extends object = object, Context = object> {
  /**
   * Create default config for this item, used when item is created for the first time.
   */
  readonly createConfig: (context: Context) => Config;

  /**
   * Is this config valid. Used to validate user's input before saving.
   */
  readonly isConfigValid: (config: Config, context: Context) => boolean;

  /**
   * `UiComponent` to be rendered when collecting configuration for this item.
   */
  readonly CollectConfig: UiComponent<CollectConfigProps<Config, Context>>;
}

/**
 * Props provided to `CollectConfig` component on every re-render.
 */
export interface CollectConfigProps<Config extends object = object, Context = object> {
  /**
   * Current (latest) config of the item.
   */
  config: Config;

  /**
   * Callback called when user updates the config in UI.
   */
  onConfig: (config: Config) => void;

  /**
   * Context information about where component is being rendered.
   */
  context: Context;
}
