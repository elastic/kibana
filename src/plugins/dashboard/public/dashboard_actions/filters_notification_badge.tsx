/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { type AggregateQuery } from '@kbn/es-query';
import type { ApplicationStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { type IEmbeddable, isErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import { EditPanelAction, isFilterableEmbeddable } from '@kbn/embeddable-plugin/public';

import { pluginServices } from '../services/plugin_services';
import { dashboardFilterNotificationBadgeStrings } from './_dashboard_actions_strings';

export const BADGE_FILTERS_NOTIFICATION = 'ACTION_FILTERS_NOTIFICATION';

export interface FiltersNotificationActionContext {
  embeddable: IEmbeddable;
}

export class FiltersNotificationBadge implements Action<FiltersNotificationActionContext> {
  public readonly id = BADGE_FILTERS_NOTIFICATION;
  public readonly type = BADGE_FILTERS_NOTIFICATION;
  public readonly order = 2;

  private displayName = dashboardFilterNotificationBadgeStrings.getDisplayName();
  private icon = 'filter';
  private applicationService;
  private embeddableService;
  private settingsService;
  private openModal;

  constructor() {
    ({
      application: this.applicationService,
      embeddable: this.embeddableService,
      overlays: { openModal: this.openModal },
      settings: this.settingsService,
    } = pluginServices.getServices());
  }

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
    // add all possible early returns to avoid the async import unless absolutely necessary
    if (
      isErrorEmbeddable(embeddable) ||
      !embeddable.getRoot().isContainer ||
      !isFilterableEmbeddable(embeddable)
    ) {
      return false;
    }
    if ((await embeddable.getFilters()).length > 0) return true;

    // all early returns failed, so go ahead and check the query now
    const { isOfQueryType, isOfAggregateQueryType } = await import('@kbn/es-query');
    const query = await embeddable.getQuery();
    return (
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

    const {
      uiSettings,
      theme: { theme$ },
    } = this.settingsService;
    const { getEmbeddableFactory, getStateTransfer } = this.embeddableService;

    const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
      uiSettings,
    });
    const editPanelAction = new EditPanelAction(
      getEmbeddableFactory,
      this.applicationService as unknown as ApplicationStart,
      getStateTransfer()
    );
    const FiltersNotificationModal = await import('./filters_notification_modal').then(
      (m) => m.FiltersNotificationModal
    );

    const session = this.openModal(
      toMountPoint(
        <KibanaReactContextProvider>
          <FiltersNotificationModal
            context={context}
            displayName={this.displayName}
            id={this.id}
            editPanelAction={editPanelAction}
            onClose={() => session.close()}
          />
        </KibanaReactContextProvider>,
        { theme$ }
      ),
      {
        'data-test-subj': 'filtersNotificationModal',
      }
    );
  };
}
