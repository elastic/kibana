/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import type { Presentable, PresentableGrouping } from '@kbn/ui-actions-browser/src/types';
import { i18n } from '@kbn/i18n';
import { Action, ActionDefinition, ActionMenuItemProps } from './action';
import { getNotifications } from '../services';

/**
 * @internal
 */
export class ActionInternal<Context extends object = object>
  implements Action<Context>, Presentable<Context>
{
  public readonly id: string;
  public readonly type: string;
  public readonly order: number;
  public readonly MenuItem?: React.FC<ActionMenuItemProps<any>>;
  public readonly grouping?: PresentableGrouping<Context>;
  public readonly showNotification?: boolean;
  public readonly disabled?: boolean;

  public readonly subscribeToCompatibilityChanges?: Action<Context>['subscribeToCompatibilityChanges'];
  public readonly couldBecomeCompatible?: Action<Context>['couldBecomeCompatible'];
  public errorLogged?: boolean;

  constructor(public readonly definition: ActionDefinition<Context>) {
    this.id = this.definition.id;
    this.type = this.definition.type || '';
    this.order = this.definition.order || 0;
    this.MenuItem = this.definition.MenuItem;
    this.grouping = this.definition.grouping;
    this.showNotification = this.definition.showNotification;
    this.disabled = this.definition.disabled;
    this.errorLogged = false;

    if (this.definition.subscribeToCompatibilityChanges) {
      this.subscribeToCompatibilityChanges = definition.subscribeToCompatibilityChanges;
    }
    if (this.definition.couldBecomeCompatible) {
      this.couldBecomeCompatible = definition.couldBecomeCompatible;
    }
  }

  public async execute(context: Context) {
    try {
      return await this.definition.execute(context);
    } catch (e) {
      getNotifications()?.toasts.addWarning(
        i18n.translate('uiActions.execute.unhandledErrorMsg', {
          defaultMessage: `Unable to execute action, error: {errorMessage}`,
          values: { errorMessage: e.message },
        })
      );
    }
  }

  public getIconType(context: Context): string | undefined {
    if (!this.definition.getIconType) return undefined;
    return this.definition.getIconType(context);
  }

  public getDisplayName(context: Context): string {
    if (!this.definition.getDisplayName) return `Action: ${this.id}`;
    return this.definition.getDisplayName(context);
  }

  public getDisplayNameTooltip(context: Context): string {
    if (!this.definition.getDisplayNameTooltip) return '';
    return this.definition.getDisplayNameTooltip(context);
  }

  public async isCompatible(context: Context): Promise<boolean> {
    if (!this.definition.isCompatible) return true;
    try {
      return await this.definition.isCompatible(context);
    } catch (e) {
      if (!this.errorLogged) {
        // eslint-disable-next-line no-console
        console.error(e);
        this.errorLogged = true;
      }
      return false;
    }
  }

  public async getHref(context: Context): Promise<string | undefined> {
    if (!this.definition.getHref) return undefined;
    return await this.definition.getHref(context);
  }

  public async shouldAutoExecute(context: Context): Promise<boolean> {
    if (!this.definition.shouldAutoExecute) return false;
    return this.definition.shouldAutoExecute(context);
  }
}
