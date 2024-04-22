/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { isOfAggregateQueryType, isOfQueryType } from '@kbn/es-query';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import {
  apiCanAccessViewMode,
  apiPublishesPartialUnifiedSearch,
  apiHasUniqueId,
  CanAccessViewMode,
  EmbeddableApiContext,
  getInheritedViewMode,
  getViewModeSubject,
  HasParentApi,
  PublishesUnifiedSearch,
  HasUniqueId,
} from '@kbn/presentation-publishing';
import { merge } from 'rxjs';
import { DashboardPluginInternalFunctions } from '../dashboard_container/external_api/dashboard_api';
import { pluginServices } from '../services/plugin_services';
import { FiltersNotificationPopover } from './filters_notification_popover';
import { dashboardFilterNotificationActionStrings } from './_dashboard_actions_strings';

export const BADGE_FILTERS_NOTIFICATION = 'ACTION_FILTERS_NOTIFICATION';

export type FiltersNotificationActionApi = HasUniqueId &
  CanAccessViewMode &
  Partial<PublishesUnifiedSearch> &
  HasParentApi<DashboardPluginInternalFunctions>;

const isApiCompatible = (api: unknown | null): api is FiltersNotificationActionApi =>
  Boolean(
    apiHasUniqueId(api) && apiCanAccessViewMode(api) && apiPublishesPartialUnifiedSearch(api)
  );

const compatibilityCheck = (api: EmbeddableApiContext['embeddable']) => {
  if (!isApiCompatible(api) || getInheritedViewMode(api) !== 'edit') return false;
  const query = api.query$?.value;
  return (
    (api.filters$?.value ?? []).length > 0 ||
    (isOfQueryType(query) && query.query !== '') ||
    isOfAggregateQueryType(query)
  );
};

export class FiltersNotificationAction implements Action<EmbeddableApiContext> {
  public readonly id = BADGE_FILTERS_NOTIFICATION;
  public readonly type = BADGE_FILTERS_NOTIFICATION;
  public readonly order = 2;

  private settingsService;

  constructor() {
    ({ settings: this.settingsService } = pluginServices.getServices());
  }

  public readonly MenuItem = ({ context }: { context: EmbeddableApiContext }) => {
    const { embeddable } = context;
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();

    const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
      uiSettings: this.settingsService.uiSettings,
    });

    return (
      <KibanaReactContextProvider>
        <FiltersNotificationPopover api={embeddable} />
      </KibanaReactContextProvider>
    );
  };

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return dashboardFilterNotificationActionStrings.getDisplayName();
  }

  public getIconType({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return 'filter';
  }

  public isCompatible = async ({ embeddable }: EmbeddableApiContext) => {
    return compatibilityCheck(embeddable);
  };

  public couldBecomeCompatible({ embeddable }: EmbeddableApiContext) {
    return apiPublishesPartialUnifiedSearch(embeddable);
  }

  public subscribeToCompatibilityChanges(
    { embeddable }: EmbeddableApiContext,
    onChange: (isCompatible: boolean, action: FiltersNotificationAction) => void
  ) {
    if (!isApiCompatible(embeddable)) return;
    return merge(
      ...[embeddable.query$, embeddable.filters$, getViewModeSubject(embeddable)].filter((value) =>
        Boolean(value)
      )
    ).subscribe(() => onChange(compatibilityCheck(embeddable), this));
  }

  public execute = async () => {};
}
