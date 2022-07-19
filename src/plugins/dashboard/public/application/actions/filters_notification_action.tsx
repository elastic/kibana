/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { CoreStart } from '@kbn/core/public';
import { isFilterableEmbeddable } from '@kbn/presentation-util-plugin/public';
import { Action, IncompatibleActionError } from '../../services/ui_actions';
import { KibanaThemeProvider, reactToUiComponent } from '../../services/kibana_react';
import { IEmbeddable, isErrorEmbeddable } from '../../services/embeddable';

import { UnlinkFromLibraryAction } from '.';
import { FiltersNotificationPopover } from './filters_notification_popover';
import { dashboardLibraryNotification } from '../../dashboard_strings';

export const ACTION_FILTERS_NOTIFICATION = 'ACTION_FILTERS_NOTIFICATION';

export interface FiltersNotificationActionContext {
  embeddable: IEmbeddable;
}

export class FiltersNotificationAction implements Action<FiltersNotificationActionContext> {
  public readonly id = ACTION_FILTERS_NOTIFICATION;
  public readonly type = ACTION_FILTERS_NOTIFICATION;
  public readonly order = 2;

  constructor(private theme: CoreStart['theme'], private unlinkAction: UnlinkFromLibraryAction) {}

  private displayName = dashboardLibraryNotification.getDisplayName();

  private icon = 'filter';

  private LibraryNotification: React.FC<{ context: FiltersNotificationActionContext }> = ({
    context,
  }: {
    context: FiltersNotificationActionContext;
  }) => {
    const { embeddable } = context;
    return (
      <KibanaThemeProvider theme$={this.theme.theme$}>
        <FiltersNotificationPopover
          unlinkAction={this.unlinkAction}
          displayName={this.displayName}
          context={context}
          icon={this.getIconType({ embeddable })}
          id={this.id}
        />
      </KibanaThemeProvider>
    );
  };

  public readonly MenuItem = reactToUiComponent(this.LibraryNotification);

  public getDisplayName({ embeddable }: FiltersNotificationActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }
    return this.displayName;
  }

  public getIconType({ embeddable }: FiltersNotificationActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }
    return this.icon;
  }

  public isCompatible = async ({ embeddable }: FiltersNotificationActionContext) => {
    return (
      !isErrorEmbeddable(embeddable) &&
      embeddable.getRoot().isContainer &&
      isFilterableEmbeddable(embeddable) &&
      embeddable.getFilters().length > 0
    );
  };

  public execute = async () => {};
}
