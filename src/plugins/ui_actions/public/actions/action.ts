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

import { Presentable } from '../util/presentable';
import { Configurable } from '../util/configurable';
import { ActionContract } from './action_contract';

/**
 * Legacy action interface, do not use. Use @type {ActionDefinition} and
 * @type {ActionInternal} instead.
 *
 * @deprecated
 */
export interface Action<Context extends {} = {}> extends Partial<Presentable<Context>> {
  id: string;

  readonly type: string;

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
   * Returns a promise that resolves to true if this action is compatible given the context,
   * otherwise resolves to false.
   */
  isCompatible(context: Context): Promise<boolean>;

  /**
   * If this returns something truthy, this is used in addition to the `execute` method when clicked.
   */
  getHref?(context: Context): string | undefined;

  /**
   * Executes the action.
   */
  execute(context: Context): Promise<void>;
}

/**
 * A convenience interface used to register an action.
 */
export interface ActionDefinition<
  PresentationContext extends object = object,
  ExecutionContext extends object = PresentationContext,
  Return = Promise<void>,
  Config extends object | undefined = undefined
>
  extends Partial<Presentable<PresentationContext>>,
    Partial<Configurable<Config, PresentationContext>> {
  /**
   * ID of the action that uniquely identifies this action in the actions registry.
   */
  readonly id: string;

  readonly type?: string;

  /**
   * ID of the `FactoryAction` that can be used to construct instances of
   * this dynamic action.
   */
  readonly factoryId?: string;

  /**
   * @deprecated
   *
   * Do not use this, use `execute` method instead.
   */
  getHref?(context: ExecutionContext): string | undefined;

  /**
   * Executes the action.
   */
  execute(
    context: ExecutionContext,
    action: ActionContract<ActionDefinition<PresentationContext, ExecutionContext, Return, Config>>
  ): Return;
}

export type AnyActionDefinition = ActionDefinition<any, any, any, any>;
export type ActionPresentationContext<A> = A extends ActionDefinition<infer Context, any, any, any>
  ? Context
  : never;
export type ActionExecutionContext<A> = A extends ActionDefinition<any, infer Context, any, any>
  ? Context
  : never;
export type ActionConfig<A> = A extends ActionDefinition<any, any, infer Config> ? Config : never;

/**
 * A convenience interface used to register a dynamic action.
 *
 * A dynamic action is one that can be create by user and registered into the
 * actions registry at runtime. User can also provide custom config for this
 * action. And dynamic actions can be serialized for storage and deserialized
 * back.
 */
export type DynamicActionDefinition<
  PresentationContext extends object = object,
  ExecutionContext extends object = PresentationContext,
  Return = Promise<void>,
  Config extends object | undefined = undefined
> = ActionDefinition<PresentationContext, ExecutionContext, Return, Config> &
  Required<
    Pick<
      ActionDefinition<PresentationContext, ExecutionContext, Return, Config>,
      'CollectConfig' | 'defaultConfig' | 'factoryId'
    >
  >;

export type AnyDynamicActionDefinition = DynamicActionDefinition<any, any, any, any>;

/**
 * Factory actions are actions used to create dynamic actions - their `execute`
 * method returns a dynamic
 */
export interface FactoryActionDefinition<
  DAD extends AnyDynamicActionDefinition,
  PresentationContext extends object = object,
  ExecutionContext extends object = PresentationContext
> extends ActionDefinition<PresentationContext, ExecutionContext, DAD> {
  /**
   * Returns an instance of a dynamic action definition.
   */
  execute(context: ExecutionContext): DAD;
}
