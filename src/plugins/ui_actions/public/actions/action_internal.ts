/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

// @ts-ignore
import React from 'react';
import { Action, ActionContext as Context, ActionDefinition } from './action';
import { Presentable, PresentableGrouping } from '../util/presentable';
import { uiToReactComponent } from '../../../kibana_react/public';

/**
 * @internal
 */
export class ActionInternal<A extends ActionDefinition = ActionDefinition>
  implements Action<Context<A>>, Presentable<Context<A>> {
  constructor(public readonly definition: A) {}

  public readonly id: string = this.definition.id;
  public readonly type: string = this.definition.type || '';
  public readonly order: number = this.definition.order || 0;
  public readonly MenuItem? = this.definition.MenuItem;
  public readonly ReactMenuItem? = this.MenuItem ? uiToReactComponent(this.MenuItem) : undefined;
  public readonly grouping?: PresentableGrouping<Context<A>> = this.definition.grouping;

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
