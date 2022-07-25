/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { CoreStart, OverlayStart } from '@kbn/core/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { isFilterableEmbeddable } from '@kbn/embeddable-plugin/public';

import { Action, IncompatibleActionError } from '../../services/ui_actions';

import { toMountPoint } from '../../services/kibana_react';
import { IEmbeddable, isErrorEmbeddable } from '../../services/embeddable';

import { FiltersNotificationModal } from './filters_notification_modal';
import { DashboardContainer } from '../embeddable';

export const BADGE_FILTERS_NOTIFICATION = 'ACTION_FILTERS_NOTIFICATION';

export interface FiltersNotificationActionContext {
  embeddable: IEmbeddable;
}

export class FiltersNotificationBadge implements Action<FiltersNotificationActionContext> {
  public readonly id = BADGE_FILTERS_NOTIFICATION;
  public readonly type = BADGE_FILTERS_NOTIFICATION;
  public readonly order = 1;

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

  // public execute = async () => {};
  public execute = async (context: FiltersNotificationActionContext) => {
    const { embeddable } = context;
    const isCompatible = await this.isCompatible({ embeddable });
    if (!isCompatible || !isFilterableEmbeddable(embeddable)) {
      throw new IncompatibleActionError();
    }
    const filters = embeddable.getFilters();
    const dataViewList: DataView[] =
      (embeddable.getRoot() as DashboardContainer)?.getAllDataViews() ?? [];

    const session = this.overlays.openModal(
      toMountPoint(
        <FiltersNotificationModal
          displayName={this.displayName}
          id={this.id}
          closeModal={() => session.close()}
          filters={filters}
          dataViewList={dataViewList}
        />,
        { theme$: this.theme.theme$ }
      ),
      {
        maxWidth: 400,
        'data-test-subj': 'copyToDashboardPanel',
      }
    );
  };
}
