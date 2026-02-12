/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CanDuplicatePanels,
  IsDuplicable,
  CanAccessViewMode,
  EmbeddableApiContext,
  HasParentApi,
  PublishesBlockingError,
  HasSerializableState,
  HasUniqueId,
} from '@kbn/presentation-publishing';
import {
  apiCanAccessViewMode,
  apiHasParentApi,
  apiHasUniqueId,
  getInheritedViewMode,
  apiHasSerializableState,
  apiCanDuplicatePanels,
  apiCanBeDuplicated,
} from '@kbn/presentation-publishing';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { dashboardClonePanelActionStrings } from './_dashboard_actions_strings';
import { ACTION_CLONE_PANEL, DASHBOARD_ACTION_GROUP } from './constants';

export type ClonePanelActionApi = CanAccessViewMode &
  HasSerializableState &
  HasUniqueId &
  HasParentApi<CanDuplicatePanels> &
  Partial<PublishesBlockingError> &
  IsDuplicable;

const isApiCompatible = (api: unknown | null): api is ClonePanelActionApi =>
  Boolean(
    apiHasUniqueId(api) &&
      apiHasSerializableState(api) &&
      apiCanAccessViewMode(api) &&
      apiHasParentApi(api) &&
      apiCanDuplicatePanels(api.parentApi) &&
      apiCanBeDuplicated(api)
  );

export class ClonePanelAction implements Action<EmbeddableApiContext> {
  public readonly type = ACTION_CLONE_PANEL;
  public readonly id = ACTION_CLONE_PANEL;
  public order = 45;
  public grouping = [DASHBOARD_ACTION_GROUP];

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
    return Boolean(
      !embeddable.blockingError$?.value && getInheritedViewMode(embeddable) === 'edit'
    );
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    embeddable.parentApi.duplicatePanel(embeddable.uuid);
  }
}
