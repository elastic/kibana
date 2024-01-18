/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { apiCanDuplicatePanels, CanDuplicatePanels } from '@kbn/presentation-containers';
import {
  apiPublishesUniqueId,
  apiPublishesParentApi,
  apiPublishesViewMode,
  EmbeddableApiContext,
  PublishesBlockingError,
  PublishesUniqueId,
  PublishesParentApi,
  PublishesViewMode,
} from '@kbn/presentation-publishing';
import { dashboardClonePanelActionStrings } from './_dashboard_actions_strings';

export const ACTION_CLONE_PANEL = 'clonePanel';

export type ClonePanelActionApi = PublishesViewMode &
  PublishesUniqueId &
  PublishesParentApi<CanDuplicatePanels> &
  Partial<PublishesBlockingError>;

const isApiCompatible = (api: unknown | null): api is ClonePanelActionApi =>
  Boolean(
    apiPublishesUniqueId(api) &&
      apiPublishesViewMode(api) &&
      apiPublishesParentApi(api) &&
      apiCanDuplicatePanels(api.parentApi.value)
  );

export class ClonePanelAction implements Action<EmbeddableApiContext> {
  public readonly type = ACTION_CLONE_PANEL;
  public readonly id = ACTION_CLONE_PANEL;
  public order = 45;

  constructor() {}

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return dashboardClonePanelActionStrings.getDisplayName();
  }

  public getIconType({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return 'copy';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) return false;
    return Boolean(!embeddable.blockingError?.value && embeddable.viewMode.value === 'edit');
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    embeddable.parentApi.value.duplicatePanel(embeddable.uuid.value);
  }
}
