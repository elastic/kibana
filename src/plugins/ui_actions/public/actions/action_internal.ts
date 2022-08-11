/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// @ts-ignore
import React from 'react';
import type { UiComponent } from '@kbn/kibana-utils-plugin/public';
import { uiToReactComponent } from '@kbn/kibana-react-plugin/public';
import { Action, ActionContext as Context, ActionDefinition, ActionMenuItemProps } from './action';
import { Presentable, PresentableGrouping } from '../util/presentable';

/**
 * @internal
 */
export class ActionInternal<A extends ActionDefinition = ActionDefinition>
  implements Action<Context<A>>, Presentable<Context<A>>
{
  public readonly id: string;
  public readonly type: string;
  public readonly order: number;
  public readonly MenuItem?: UiComponent<ActionMenuItemProps<Context<A>>>;
  public readonly ReactMenuItem?: React.FC<ActionMenuItemProps<Context<A>>>;
  public readonly grouping?: PresentableGrouping<Context<A>>;

  constructor(public readonly definition: A) {
    this.id = this.definition.id;
    this.type = this.definition.type || '';
    this.order = this.definition.order || 0;
    this.MenuItem = this.definition.MenuItem;
    this.ReactMenuItem = this.MenuItem ? uiToReactComponent(this.MenuItem) : undefined;
    this.grouping = this.definition.grouping;
  }

  public execute(context: Context<A>) {
    return this.definition.execute(context);
  }

  public getIconType(context: Context<A>): string | undefined {
    if (!this.definition.getIconType) return undefined;
    return this.definition.getIconType(context);
  }

  public getDisplayName(context: Context<A>): string {
    if (!this.definition.getDisplayName) return `Action: ${this.id}`;
    return this.definition.getDisplayName(context);
  }

  public getDisplayNameTooltip(context: Context<A>): string {
    if (!this.definition.getDisplayNameTooltip) return '';
    return this.definition.getDisplayNameTooltip(context);
  }

  public async isCompatible(context: Context<A>): Promise<boolean> {
    if (!this.definition.isCompatible) return true;
    return await this.definition.isCompatible(context);
  }

  public async getHref(context: Context<A>): Promise<string | undefined> {
    if (!this.definition.getHref) return undefined;
    return await this.definition.getHref(context);
  }

  public async shouldAutoExecute(context: Context<A>): Promise<boolean> {
    if (!this.definition.shouldAutoExecute) return false;
    return this.definition.shouldAutoExecute(context);
  }
}
