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

/**
 * A convenience interface used to register an action.
 */
export interface ActionDefinition<Context extends {} = {}, Return = Promise<void>> {
  /**
   * Determined the order when there is more than one action matched to a trigger.
   * Higher numbers are displayed first.
   */
  readonly order?: number;

  /**
   * ID of the action that uniquely identifies this action in the actions registry.
   */
  readonly id: string;

  readonly type?: string;

  /**
   * Optional EUI icon type that can be displayed along with the title.
   */
  getIconType?(context: Context): string | undefined;

  /**
   * Returns a title to be displayed to the user.
   * @param context
   */
  getDisplayName?(context: Context): string;

  /**
   * `UiComponent` to render when displaying this action as a context menu item.
   * If not provided, `getDisplayName` will be used instead.
   */
  readonly MenuItem?: UiComponent<{ context: Context }>;

  /**
   * Returns a promise that resolves to true if this action is compatible given the context,
   * otherwise resolves to false.
   */
  isCompatible?(context: Context): Promise<boolean>;

  /**
   * If this returns something truthy, this is used in addition to the `execute` method when clicked.
   */
  getHref?(context: Context): string | undefined;

  /**
   * Executes the action.
   */
  execute(context: Context): Return;
}

/**
 * A convenience interface used to register a dynamic action.
 *
 * A dynamic action is one that can be create by user and registered into the
 * actions registry at runtime. User can also provide custom config for this
 * action. And dynamic actions can be serialized for storage and deserialized
 * back.
 */
export interface DynamicActionDefinition<
  Context extends object = object,
  Return = Promise<void>,
  Config extends object = object
> extends ActionDefinition<Context, Return> {
  /**
   * ID of the `FactoryAction` that can be used to construct instances of
   * this dynamic action.
   */
  readonly factoryId: string;

  /**
   * Default config for this action, used when action is created for the first
   * time.
   */
  readonly defaultConfig: Config;

  /**
   * `UiComponent` to be rendered when collecting configuration for this dynamic
   * action.
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

export type DynamicActionConfig<T> = T extends DynamicActionDefinition<infer Config, any, any>
  ? Config
  : never;

/**
 * `FactoryAction` is used to create instances of `DynamicAction`.
 */
export interface FactoryActionDefinition<
  DA extends DynamicActionDefinition<any, any, any>,
  Context extends object = object
> extends ActionDefinition<Context, DA> {
  /**
   * Returns an instance of a dynamic action definition.
   */
  execute(context: Context): DA;
}

export type ActionContext<A> = A extends ActionDefinition<infer Context, any> ? Context : never;
