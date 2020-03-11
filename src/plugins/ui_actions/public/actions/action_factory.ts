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

import { uiToReactComponent } from '../../../kibana_react/public';
import { Presentable } from '../util/presentable';
import { ActionDefinition } from './action';
import {
  AnyActionFactoryDefinition,
  AFDConfig as Config,
  AFDFactoryContext as FactoryContext,
  AFDActionContext as ActionContext,
} from './action_factory_definition';
import { Configurable } from '../util';
import { SerializedAction } from './types';

export class ActionFactory<D extends AnyActionFactoryDefinition>
  implements Presentable<FactoryContext<D>>, Configurable<Config<D>> {
  constructor(public readonly definition: D) {}

  public readonly id = this.definition.id;
  public readonly order = this.definition.order || 0;
  public readonly MenuItem? = this.definition.MenuItem;
  public readonly ReactMenuItem? = this.MenuItem ? uiToReactComponent(this.MenuItem) : undefined;

  public readonly CollectConfig = this.definition.CollectConfig;
  public readonly ReactCollectConfig = uiToReactComponent(this.CollectConfig);
  public readonly createConfig = this.definition.createConfig;
  public readonly isConfigValid = this.definition.isConfigValid;

  public getIconType(context: FactoryContext<D>): string | undefined {
    if (!this.definition.getIconType) return undefined;
    return this.definition.getIconType(context);
  }

  public getDisplayName(context: FactoryContext<D>): string {
    if (!this.definition.getDisplayName) return '';
    return this.definition.getDisplayName(context);
  }

  public async isCompatible(context: FactoryContext<D>): Promise<boolean> {
    if (!this.definition.isCompatible) return true;
    return await this.definition.isCompatible(context);
  }

  public getHref(context: FactoryContext<D>): string | undefined {
    if (!this.definition.getHref) return undefined;
    return this.definition.getHref(context);
  }

  public create(
    serializedAction: Omit<SerializedAction<Config<D>>, 'factoryId'>
  ): ActionDefinition<ActionContext<D>> {
    return this.definition.create(serializedAction);
  }
}

export type AnyActionFactory = ActionFactory<any>;
