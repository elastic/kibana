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

import { EuiContextMenuItemIcon } from '@elastic/eui';

import { IEmbeddable } from '../embeddables';

export interface ActionContext<
  TEmbeddable extends IEmbeddable = IEmbeddable,
  TTriggerContext extends {} = {}
> {
  embeddable: TEmbeddable;
  triggerContext?: TTriggerContext;
}

export abstract class Action<
  TEmbeddable extends IEmbeddable = IEmbeddable,
  TTriggerContext extends {} = {}
> {
  /**
   * Determined the order when there is more than one action matched to a trigger.
   * Higher numbers are displayed first.
   */
  public order: number = 0;
  public abstract readonly type: string;

  constructor(public readonly id: string) {}

  /**
   * Optional icon that can be displayed along with the title.
   */
  public getIcon(
    context: ActionContext<TEmbeddable, TTriggerContext>
  ): EuiContextMenuItemIcon | undefined {
    return undefined;
  }

  /**
   * Returns a title to be displayed to the user.
   * @param context
   */
  public abstract getDisplayName(context: ActionContext<TEmbeddable, TTriggerContext>): string;

  /**
   * Returns a promise that resolves to true if this action is compatible given the context,
   * otherwise resolves to false.
   */
  public async isCompatible(
    context: ActionContext<TEmbeddable, TTriggerContext>
  ): Promise<boolean> {
    return true;
  }

  /**
   * If this returns something other than undefined, this is used instead of execute when clicked.
   */
  public getHref(context: ActionContext<TEmbeddable, TTriggerContext>): string | undefined {
    return undefined;
  }

  /**
   * Executes the action.
   */
  public abstract execute(context: ActionContext<TEmbeddable, TTriggerContext>): void;
}
