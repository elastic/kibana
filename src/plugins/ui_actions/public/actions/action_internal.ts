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

/* eslint-disable max-classes-per-file */

import { Mutable } from '@kbn/utility-types';
import { Action, ActionContext, AnyActionDefinition, ActionConfig } from './action';

export class ActionInternal<A extends AnyActionDefinition> implements Action<ActionContext<A>> {
  constructor(public readonly definition: A) {}

  public readonly id: string = this.definition.id;
  public readonly order: number = this.definition.order || 0;
  public readonly type: string = this.definition.type || '';
  public readonly factoryId: string = this.definition.factoryId || '';
  public readonly MenuItem? = this.definition.MenuItem;
  public config: ActionConfig<A> = this.definition.defaultConfig || undefined;

  public execute(context: ActionContext<A>) {
    return this.definition.execute(context, this.config);
  }

  public getIconType(context: ActionContext<A>): string | undefined {
    if (!this.definition.getIconType) return undefined;
    return this.definition.getIconType(context);
  }

  public getDisplayName(context: ActionContext<A>): string {
    if (!this.definition.getDisplayName) return '';
    return this.definition.getDisplayName(context);
  }

  public async isCompatible(context: ActionContext<A>): Promise<boolean> {
    if (!this.definition.isCompatible) return true;
    return await this.definition.isCompatible(context);
  }

  public getHref(context: ActionContext<A>): string | undefined {
    if (!this.definition.getHref) return undefined;
    return this.definition.getHref(context);
  }

  serialize(): SerializedAction {
    const serialized: Mutable<SerializedAction> = {
      factoryId: this.factoryId,
      id: this.id,
      type: this.type || '',
      config: this.config,
    };

    if (typeof this.definition.order !== 'undefined') {
      serialized.order = this.order;
    }

    return serialized;
  }
}

export type AnyActionInternal = ActionInternal<any>;

export interface SerializedAction<Config extends object = object> {
  readonly factoryId: string;
  readonly id: string;
  readonly type: string;
  readonly order?: number;
  readonly config: Config;
}
