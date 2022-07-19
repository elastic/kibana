/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { CoreStart, OverlayStart } from '@kbn/core/public';
import { isFilterableEmbeddable } from '@kbn/presentation-util-plugin/public';
import { Action, IncompatibleActionError } from '../../services/ui_actions';
import { KibanaThemeProvider, reactToUiComponent, toMountPoint } from '../../services/kibana_react';
import { IEmbeddable, isErrorEmbeddable } from '../../services/embeddable';

import { FiltersNotificationModal } from './filters_notification_modal';
import { EuiBadge } from '@elastic/eui';
// import { dashboardLibraryNotification } from '../../dashboard_strings';

export const BADGE_FILTERS_NOTIFICATION = 'ACTION_FILTERS_NOTIFICATION';

export interface FiltersNotificationActionContext {
  embeddable: IEmbeddable;
}

export class FiltersNotificationBadge implements Action<FiltersNotificationActionContext> {
  public readonly id = BADGE_FILTERS_NOTIFICATION;
  public readonly type = BADGE_FILTERS_NOTIFICATION;
  public readonly order = 3;

  // private displayName = dashboardLibraryNotification.getDisplayName();
  private displayName = 'Custom filters';

  private icon = 'filter';

  constructor(private theme: CoreStart['theme'], private overlays: OverlayStart) {}

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

  public getDisplayNameTooltip(context: FiltersNotificationActionContext) {
    console.log('here in tooltip');
    return 'this is a tooltip';
  }

  // public execute = async () => {};
  public execute = async (context: FiltersNotificationActionContext) => {
    const { embeddable } = context;
    const isCompatible = await this.isCompatible({ embeddable });
    if (!isCompatible) {
      throw new IncompatibleActionError();
    }
    console.log('here in execute');

    const session = this.overlays.openModal(
      toMountPoint(
        <FiltersNotificationModal
          displayName={this.displayName}
          context={context}
          icon={this.getIconType({ embeddable })}
          id={this.id}
          closeModal={() => session.close()}
        />,
        { theme$: this.theme.theme$ }
      ),
      {
        maxWidth: 400,
        'data-test-subj': 'copyToDashboardPanel',
      }
    );

    // Only here for typescript
    // const { embeddable } = context;
    // return (
    //   <KibanaThemeProvider theme$={this.theme.theme$}>
    //     <FiltersNotificationPopover
    //       displayName={this.displayName}
    //       context={context}
    //       icon={this.getIconType({ embeddable })}
    //       id={this.id}
    //     />
    //   </KibanaThemeProvider>
    // );
  };
}
