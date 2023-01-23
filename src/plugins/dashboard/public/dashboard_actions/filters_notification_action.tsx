/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EditPanelAction, isFilterableEmbeddable, ViewMode } from '@kbn/embeddable-plugin/public';
import { type IEmbeddable, isErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import type { ApplicationStart } from '@kbn/core/public';
import { type AggregateQuery } from '@kbn/es-query';

import { FiltersNotificationPopover } from './filters_notification_popover';
import { dashboardFilterNotificationActionStrings } from './_dashboard_actions_strings';
import { pluginServices } from '../services/plugin_services';

export const BADGE_FILTERS_NOTIFICATION = 'ACTION_FILTERS_NOTIFICATION';

export interface FiltersNotificationActionContext {
  embeddable: IEmbeddable;
}

export class FiltersNotificationAction implements Action<FiltersNotificationActionContext> {
  public readonly id = BADGE_FILTERS_NOTIFICATION;
  public readonly type = BADGE_FILTERS_NOTIFICATION;
  public readonly order = 2;

  private displayName = dashboardFilterNotificationActionStrings.getDisplayName();
  private icon = 'filter';
  private applicationService;
  private embeddableService;
  private settingsService;

  constructor() {
    ({
      application: this.applicationService,
      embeddable: this.embeddableService,
      settings: this.settingsService,
    } = pluginServices.getServices());
  }

  public readonly MenuItem = ({ context }: { context: FiltersNotificationActionContext }) => {
    const { embeddable } = context;

    const editPanelAction = new EditPanelAction(
      this.embeddableService.getEmbeddableFactory,
      this.applicationService as unknown as ApplicationStart,
      this.embeddableService.getStateTransfer()
    );

    const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
      uiSettings: this.settingsService.uiSettings,
    });

    return (
      <KibanaReactContextProvider>
        <FiltersNotificationPopover
          editPanelAction={editPanelAction}
          displayName={this.displayName}
          context={context}
          icon={this.getIconType({ embeddable })}
          id={this.id}
        />
      </KibanaReactContextProvider>
    );
  };

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
      embeddable.getInput()?.viewMode !== ViewMode.EDIT ||
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

  public execute = async () => {};
}
