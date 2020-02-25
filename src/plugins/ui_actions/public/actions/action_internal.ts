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

import { Action, ActionExecutionContext, AnyActionDefinition } from './action';
import { Presentable } from '../util/presentable';
import { createActionStateContainer, ActionState } from './action_state_container';
import { uiToReactComponent } from '../../../kibana_react/public';
import { ActionContract } from './action_contract';

export class ActionInternal<A extends AnyActionDefinition>
  implements Action<ActionExecutionContext<A>>, Presentable<ActionExecutionContext<A>> {
  constructor(public readonly definition: A) {}

  public readonly id: string = this.definition.id;
  public readonly type: string = this.definition.type || '';
  public readonly factoryId: string = this.definition.factoryId || '';
  public readonly MenuItem? = this.definition.MenuItem;
  public readonly ReactMenuItem? = this.MenuItem ? uiToReactComponent(this.MenuItem) : undefined;
  public readonly CollectConfig? = this.definition.CollectConfig;
  public readonly ReactCollectConfig? = this.CollectConfig
    ? uiToReactComponent(this.CollectConfig)
    : undefined;

  public get contract(): ActionContract<A> {
    return this;
  }

  public get order() {
    return this.state.get().order;
  }

  public readonly state = createActionStateContainer({
    name: '',
    order: this.definition.order || 0,
    config: this.definition.defaultConfig || {},
  });

  public execute(context: ActionExecutionContext<A>) {
    return this.definition.execute(context, this.contract);
  }

  public getIconType(context: ActionExecutionContext<A>): string | undefined {
    if (!this.definition.getIconType) return undefined;
    return this.definition.getIconType(context);
  }

  public getDisplayName(context: ActionExecutionContext<A>): string {
    if (!this.definition.getDisplayName) return '';
    return this.definition.getDisplayName(context);
  }

  public async isCompatible(context: ActionExecutionContext<A>): Promise<boolean> {
    if (!this.definition.isCompatible) return true;
    return await this.definition.isCompatible(context);
  }

  public getHref(context: ActionExecutionContext<A>): string | undefined {
    if (!this.definition.getHref) return undefined;
    return this.definition.getHref(context);
  }

  serialize(): SerializedAction {
    const state = this.state.get();
    const serialized: SerializedAction = {
      factoryId: this.factoryId,
      id: this.id,
      type: this.type || '',
      state,
    };

    return serialized;
  }

  deserialize({ state }: SerializedAction) {
    this.state.set(state);
  }
}

export type AnyActionInternal = ActionInternal<any>;

export interface SerializedAction<Config extends object = object> {
  readonly factoryId: string;
  readonly id: string;
  readonly type: string;
  readonly state: ActionState<Config>;
}
