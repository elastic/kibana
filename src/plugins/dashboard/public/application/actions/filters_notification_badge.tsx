/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { CoreStart, OverlayStart } from '@kbn/core/public';
import { EditPanelAction, isFilterableEmbeddable } from '@kbn/embeddable-plugin/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';

import { Action, IncompatibleActionError } from '../../services/ui_actions';
import { toMountPoint } from '../../services/kibana_react';
import { IEmbeddable, isErrorEmbeddable } from '../../services/embeddable';
import { dashboardFilterNotificationBadge } from '../../dashboard_strings';
import { AggregateQuery, isOfAggregateQueryType, isOfQueryType } from '@kbn/es-query';

export const BADGE_FILTERS_NOTIFICATION = 'ACTION_FILTERS_NOTIFICATION';

export interface FiltersNotificationActionContext {
  embeddable: IEmbeddable;
}

export class FiltersNotificationBadge implements Action<FiltersNotificationActionContext> {
  public readonly id = BADGE_FILTERS_NOTIFICATION;
  public readonly type = BADGE_FILTERS_NOTIFICATION;
  public readonly order = 2;

  private displayName = dashboardFilterNotificationBadge.getDisplayName();
  private icon = 'filter';

  constructor(
    private theme: CoreStart['theme'],
    private overlays: OverlayStart,
    private uiSettings: CoreStart['uiSettings'],
    private editPanelAction: EditPanelAction
  ) {}

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
    if (
      isErrorEmbeddable(embeddable) ||
      !embeddable.getRoot().isContainer ||
      !isFilterableEmbeddable(embeddable)
    ) {
      return false;
    }

    const query = await embeddable.getQuery();
    return (
      (await embeddable.getFilters()).length > 0 ||
      (isOfQueryType(query) && query.query !== '') ||
      isOfAggregateQueryType(query as AggregateQuery)
    );
  };

  public execute = async (context: FiltersNotificationActionContext) => {
    const { embeddable } = context;

    const isCompatible = await this.isCompatible({ embeddable });
    if (!isCompatible || !isFilterableEmbeddable(embeddable)) {
      throw new IncompatibleActionError();
    }

    const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
      uiSettings: this.uiSettings,
    });

    const FiltersNotificationModal = await import('./filters_notification_modal').then(
      (m) => m.FiltersNotificationModal
    );

    const session = this.overlays.openModal(
      toMountPoint(
        <KibanaReactContextProvider>
          <FiltersNotificationModal
            context={context}
            displayName={this.displayName}
            id={this.id}
            editPanelAction={this.editPanelAction}
            onClose={() => session.close()}
          />
        </KibanaReactContextProvider>,
        { theme$: this.theme.theme$ }
      ),
      {
        'data-test-subj': 'filtersNotificationModal',
      }
    );
  };
}
