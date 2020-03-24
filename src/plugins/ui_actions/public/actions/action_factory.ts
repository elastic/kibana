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
import { ActionFactoryDefinition } from './action_factory_definition';
import { Configurable } from '../util';
import { SerializedAction } from './types';

export class ActionFactory<
  Config extends object = object,
  FactoryContext extends object = object,
  ActionContext extends object = object
> implements Presentable<FactoryContext>, Configurable<Config, FactoryContext> {
  constructor(
    protected readonly def: ActionFactoryDefinition<Config, FactoryContext, ActionContext>
  ) {}

  public readonly id = this.def.id;
  public readonly order = this.def.order || 0;
  public readonly MenuItem? = this.def.MenuItem;
  public readonly ReactMenuItem? = this.MenuItem ? uiToReactComponent(this.MenuItem) : undefined;

  public readonly CollectConfig = this.def.CollectConfig;
  public readonly ReactCollectConfig = uiToReactComponent(this.CollectConfig);
  public readonly createConfig = this.def.createConfig;
  public readonly isConfigValid = this.def.isConfigValid;

  public getIconType(context: FactoryContext): string | undefined {
    if (!this.def.getIconType) return undefined;
    return this.def.getIconType(context);
  }

  public getDisplayName(context: FactoryContext): string {
    if (!this.def.getDisplayName) return '';
    return this.def.getDisplayName(context);
  }

  public async isCompatible(context: FactoryContext): Promise<boolean> {
    if (!this.def.isCompatible) return true;
    return await this.def.isCompatible(context);
  }

  public getHref(context: FactoryContext): string | undefined {
    if (!this.def.getHref) return undefined;
    return this.def.getHref(context);
  }

  public create(
    serializedAction: Omit<SerializedAction<Config>, 'factoryId'>
  ): ActionDefinition<ActionContext> {
    return this.def.create(serializedAction);
  }
}
