/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { Presentable, PresentableGrouping } from '../types';
import type { Action, ActionDefinition, ActionMenuItemProps } from './action';

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

  public readonly getCompatibilityChangesSubject?: Action<Context>['getCompatibilityChangesSubject'];
  public readonly couldBecomeCompatible?: Action<Context>['couldBecomeCompatible'];
  public errorLogged?: boolean;

  private getNotificationsService: () => CoreStart['notifications'] | undefined;

  constructor(
    public readonly definition: ActionDefinition<Context>,
    getNotificationsService: () => CoreStart['notifications'] | undefined
  ) {
    this.id = this.definition.id;
    this.type = this.definition.type || '';
    this.order = this.definition.order || 0;
    this.MenuItem = this.definition.MenuItem;
    this.grouping = this.definition.grouping;
    this.showNotification = this.definition.showNotification;
    this.disabled = this.definition.disabled;
    this.errorLogged = false;
    this.getNotificationsService = getNotificationsService;

    if (this.definition.getCompatibilityChangesSubject) {
      this.getCompatibilityChangesSubject = definition.getCompatibilityChangesSubject;
    }
    if (this.definition.couldBecomeCompatible) {
      this.couldBecomeCompatible = definition.couldBecomeCompatible;
    }
  }

  public async execute(context: Context) {
    const notificationsService = this.getNotificationsService();
    if (!notificationsService) {
      throw new Error('Notifications service is not available');
    }
    try {
      return await this.definition.execute(context);
    } catch (e) {
      notificationsService.toasts.addWarning(
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
