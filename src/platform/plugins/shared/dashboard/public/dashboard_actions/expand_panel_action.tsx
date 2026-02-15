/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CanExpandPanels,
  IsExpandable,
  EmbeddableApiContext,
  HasParentApi,
  HasUniqueId,
} from '@kbn/presentation-publishing';
import {
  apiHasParentApi,
  apiHasUniqueId,
  apiCanExpandPanels,
  apiCanBeExpanded,
} from '@kbn/presentation-publishing';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { map, skip } from 'rxjs';

import { dashboardExpandPanelActionStrings } from './_dashboard_actions_strings';
import { ACTION_EXPAND_PANEL, DASHBOARD_ACTION_GROUP } from './constants';

export type ExpandPanelActionApi = HasUniqueId & HasParentApi<CanExpandPanels> & IsExpandable;

const isApiCompatible = (api: unknown | null): api is ExpandPanelActionApi =>
  apiCanBeExpanded(api) &&
  Boolean(apiHasUniqueId(api) && apiHasParentApi(api) && apiCanExpandPanels(api.parentApi));

export class ExpandPanelAction implements Action<EmbeddableApiContext> {
  public readonly type = ACTION_EXPAND_PANEL;
  public readonly id = ACTION_EXPAND_PANEL;
  public order = 9;
  public grouping = [DASHBOARD_ACTION_GROUP];

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return embeddable.parentApi.expandedPanelId$.value
      ? dashboardExpandPanelActionStrings.getMinimizeTitle()
      : dashboardExpandPanelActionStrings.getMaximizeTitle();
  }

  public getIconType({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return embeddable.parentApi.expandedPanelId$.value ? 'minimize' : 'expand';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    return isApiCompatible(embeddable);
  }

  public couldBecomeCompatible({ embeddable }: EmbeddableApiContext) {
    return apiHasParentApi(embeddable) && apiCanExpandPanels(embeddable.parentApi);
  }

  public getCompatibilityChangesSubject({ embeddable }: EmbeddableApiContext) {
    return isApiCompatible(embeddable)
      ? embeddable.parentApi.expandedPanelId$.pipe(
          skip(1),
          map(() => undefined)
        )
      : undefined;
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    embeddable.parentApi.expandPanel(embeddable.uuid);
  }
}
