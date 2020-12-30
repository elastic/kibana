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
import { ActionType, ActionContextMapping, BaseContext } from '../types';
import { Presentable } from '../util/presentable';
import { Trigger } from '../triggers';

export type ActionByType<T extends ActionType> = Action<ActionContextMapping[T], T>;
export type ActionDefinitionByType<T extends ActionType> = ActionDefinition<
  ActionContextMapping[T]
>;

/**
 * During action execution we can provide additional information,
 * for example, trigger, that caused the action execution
 */
export interface ActionExecutionMeta {
  /**
   * Trigger that executed the action
   */
  trigger: Trigger;
}

/**
 * Action methods are executed with Context from trigger + {@link ActionExecutionMeta}
 */
export type ActionExecutionContext<Context extends BaseContext = BaseContext> = Context &
  ActionExecutionMeta;

/**
 * Simplified action context for {@link ActionDefinition}
 * When defining action consumer may use either it's own Context
 * or an ActionExecutionContext<Context> to get access to {@link ActionExecutionMeta} params
 */
export type ActionDefinitionContext<Context extends BaseContext = BaseContext> =
  | Context
  | ActionExecutionContext<Context>;

export interface Action<Context extends BaseContext = {}, T = ActionType>
  extends Partial<Presentable<ActionExecutionContext<Context>>> {
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
  getIconType(context: ActionExecutionContext<Context>): string | undefined;

  /**
   * Returns a title to be displayed to the user.
   * @param context
   */
  getDisplayName(context: ActionExecutionContext<Context>): string;

  /**
   * `UiComponent` to render when displaying this action as a context menu item.
   * If not provided, `getDisplayName` will be used instead.
   */
  MenuItem?: UiComponent<{ context: ActionExecutionContext<Context> }>;

  /**
   * Returns a promise that resolves to true if this action is compatible given the context,
   * otherwise resolves to false.
   */
  isCompatible(context: ActionExecutionContext<Context>): Promise<boolean>;

  /**
   * Executes the action.
   */
  execute(context: ActionExecutionContext<Context>): Promise<void>;

  /**
   * This method should return a link if this item can be clicked on. The link
   * is used to navigate user if user middle-clicks it or Ctrl + clicks or
   * right-clicks and selects "Open in new tab".
   */
  getHref?(context: ActionExecutionContext<Context>): Promise<string | undefined>;

  /**
   * Determines if action should be executed automatically,
   * without first showing up in context menu.
   * false by default.
   */
  shouldAutoExecute?(context: ActionExecutionContext<Context>): Promise<boolean>;
}

/**
 * A convenience interface used to register an action.
 */
export interface ActionDefinition<Context extends BaseContext = {}>
  extends Partial<Presentable<ActionDefinitionContext<Context>>> {
  /**
   * ID of the action that uniquely identifies this action in the actions registry.
   */
  readonly id: string;

  /**
   * ID of the factory for this action. Used to construct dynamic actions.
   */
  readonly type?: ActionType;

  /**
   * Returns a promise that resolves to true if this item is compatible given
   * the context and should be displayed to user, otherwise resolves to false.
   */
  isCompatible?(context: ActionDefinitionContext<Context>): Promise<boolean>;

  /**
   * Executes the action.
   */
  execute(context: ActionDefinitionContext<Context>): Promise<void>;

  /**
   * Determines if action should be executed automatically,
   * without first showing up in context menu.
   * false by default.
   */
  shouldAutoExecute?(context: ActionDefinitionContext<Context>): Promise<boolean>;

  /**
   * This method should return a link if this item can be clicked on. The link
   * is used to navigate user if user middle-clicks it or Ctrl + clicks or
   * right-clicks and selects "Open in new tab".
   */
  getHref?(context: ActionDefinitionContext<Context>): Promise<string | undefined>;
}

export type ActionContext<A> = A extends ActionDefinition<infer Context> ? Context : never;
