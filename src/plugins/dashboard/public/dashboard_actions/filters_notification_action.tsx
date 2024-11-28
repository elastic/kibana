/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { merge } from 'rxjs';

import { isOfAggregateQueryType, isOfQueryType } from '@kbn/es-query';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import {
  apiPublishesPartialUnifiedSearch,
  apiHasUniqueId,
  EmbeddableApiContext,
  HasParentApi,
  HasUniqueId,
  PublishesDataViews,
  PublishesUnifiedSearch,
  CanLockHoverActions,
  CanAccessViewMode,
} from '@kbn/presentation-publishing';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { coreServices } from '../services/kibana_services';
import { dashboardFilterNotificationActionStrings } from './_dashboard_actions_strings';
import { FiltersNotificationPopover } from './filters_notification_popover';

export const BADGE_FILTERS_NOTIFICATION = 'ACTION_FILTERS_NOTIFICATION';

export type FiltersNotificationActionApi = HasUniqueId &
  Partial<PublishesUnifiedSearch> &
  Partial<HasParentApi<Partial<PublishesDataViews>>> &
  Partial<CanLockHoverActions> &
  Partial<CanAccessViewMode> & {
    type?: string;
  };

const isApiCompatible = (api: unknown | null): api is FiltersNotificationActionApi =>
  Boolean(apiHasUniqueId(api) && apiPublishesPartialUnifiedSearch(api));

const compatibilityCheck = (api: EmbeddableApiContext['embeddable']) => {
  if (!isApiCompatible(api)) return false;
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

  public readonly MenuItem = ({ context }: { context: EmbeddableApiContext }) => {
    const { embeddable } = context;
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();

    const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
      uiSettings: coreServices.uiSettings,
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
      ...[embeddable.query$, embeddable.filters$].filter((value) => Boolean(value))
    ).subscribe(() => onChange(compatibilityCheck(embeddable), this));
  }

  public execute = async () => {};
}
