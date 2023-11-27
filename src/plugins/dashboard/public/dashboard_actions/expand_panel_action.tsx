/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  apiCanExpandPanels,
  CanExpandPanels,
  getExpandedPanelId,
} from '@kbn/presentation-containers';
import {
  apiPublishesUniqueId,
  apiPublishesParentApi,
  apiPublishesViewMode,
  EmbeddableApiContext,
  PublishesUniqueId,
  PublishesParentApi,
  PublishesViewMode,
} from '@kbn/presentation-publishing';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { dashboardExpandPanelActionStrings } from './_dashboard_actions_strings';

export const ACTION_EXPAND_PANEL = 'togglePanel';

type ExpandPanelActionApi = PublishesViewMode &
  PublishesUniqueId &
  PublishesParentApi<CanExpandPanels>;

const isApiCompatible = (api: unknown | null): api is ExpandPanelActionApi =>
  Boolean(
    apiPublishesUniqueId(api) &&
      apiPublishesViewMode(api) &&
      apiPublishesParentApi(api) &&
      apiCanExpandPanels(api.parentApi.value)
  );

export class ExpandPanelAction implements Action<EmbeddableApiContext> {
  public readonly type = ACTION_EXPAND_PANEL;
  public readonly id = ACTION_EXPAND_PANEL;
  public order = 7;

  constructor() {}

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return getExpandedPanelId(embeddable.parentApi.value)
      ? dashboardExpandPanelActionStrings.getMinimizeTitle()
      : dashboardExpandPanelActionStrings.getMaximizeTitle();
  }

  public getIconType({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return getExpandedPanelId(embeddable.parentApi.value) ? 'minimize' : 'expand';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    return isApiCompatible(embeddable);
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    embeddable.parentApi.value.expandPanel(
      getExpandedPanelId(embeddable.parentApi.value) ? undefined : embeddable.uuid.value
    );
  }
}
