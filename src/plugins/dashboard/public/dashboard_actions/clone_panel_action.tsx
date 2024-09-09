/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiCanDuplicatePanels, CanDuplicatePanels } from '@kbn/presentation-containers';
import {
  apiCanAccessViewMode,
  apiHasParentApi,
  apiHasUniqueId,
  CanAccessViewMode,
  EmbeddableApiContext,
  getInheritedViewMode,
  HasParentApi,
  PublishesBlockingError,
  HasUniqueId,
} from '@kbn/presentation-publishing';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { dashboardClonePanelActionStrings } from './_dashboard_actions_strings';

export const ACTION_CLONE_PANEL = 'clonePanel';

export type ClonePanelActionApi = CanAccessViewMode &
  HasUniqueId &
  HasParentApi<CanDuplicatePanels> &
  Partial<PublishesBlockingError>;

const isApiCompatible = (api: unknown | null): api is ClonePanelActionApi =>
  Boolean(
    apiHasUniqueId(api) &&
      apiCanAccessViewMode(api) &&
      apiHasParentApi(api) &&
      apiCanDuplicatePanels(api.parentApi)
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
    return Boolean(!embeddable.blockingError?.value && getInheritedViewMode(embeddable) === 'edit');
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    embeddable.parentApi.duplicatePanel(embeddable.uuid);
  }
}
