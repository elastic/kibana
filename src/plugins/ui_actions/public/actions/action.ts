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

import { UiComponent } from 'src/plugins/kibana_utils/public';
import { ActionType, ActionContextMapping } from '../types';
import { Presentable } from '../util/presentable';

export type ActionByType<T extends ActionType> = Action<ActionContextMapping[T], T>;

export interface Action<Context extends {} = {}, T = ActionType>
  extends Partial<Presentable<Context>> {
  /**
   * Determined the order when there is more than one action matched to a trigger.
   * Higher numbers are displayed first.
   */
  order?: number;

  /**
   * A unique identifier for this action instance.
   */
  id: string;

  /**
   * The action type is what determines the context shape.
   */
  readonly type: T;

  /**
   * Optional EUI icon type that can be displayed along with the title.
   */
  getIconType(context: Context): string | undefined;

  /**
   * Returns a title to be displayed to the user.
   * @param context
   */
  getDisplayName(context: Context): string;

  /**
   * `UiComponent` to render when displaying this action as a context menu item.
   * If not provided, `getDisplayName` will be used instead.
   */
  MenuItem?: UiComponent<{ context: Context }>;

  /**
   * Returns a promise that resolves to true if this action is compatible given the context,
   * otherwise resolves to false.
   */
  isCompatible(context: Context): Promise<boolean>;

  /**
   * Executes the action.
   */
  execute(context: Context): Promise<void>;

  /**
   * Determines if action should be executed automatically,
   * without first showing up in context menu.
   * false by default.
   */
  shouldAutoExecute?(context: Context): Promise<boolean>;
}

/**
 * A convenience interface used to register an action.
 */
export interface ActionDefinition<Context extends object = object>
  extends Partial<Presentable<Context>> {
  /**
   * ID of the action that uniquely identifies this action in the actions registry.
   */
  readonly id: string;

  /**
   * ID of the factory for this action. Used to construct dynamic actions.
   */
  readonly type?: ActionType;

  /**
   * Executes the action.
   */
  execute(context: Context): Promise<void>;

  /**
   * Determines if action should be executed automatically,
   * without first showing up in context menu.
   * false by default.
   */
  shouldAutoExecute?(context: Context): Promise<boolean>;
}

export type ActionContext<A> = A extends ActionDefinition<infer Context> ? Context : never;
