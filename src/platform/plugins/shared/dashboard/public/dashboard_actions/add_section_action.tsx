/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiCanExpandPanels, CanExpandPanels } from '@kbn/presentation-containers';
import {
  apiHasParentApi,
  apiHasUniqueId,
  EmbeddableApiContext,
  HasParentApi,
  HasUniqueId,
} from '@kbn/presentation-publishing';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { map, skip } from 'rxjs';
import { ADD_PANEL_ANNOTATION_GROUP } from '@kbn/embeddable-plugin/public';

import { dashboardExpandPanelActionStrings } from './_dashboard_actions_strings';
import { ACTION_ADD_SECTION } from './constants';

type AddSectionActionApi = HasUniqueId & HasParentApi<CanExpandPanels>;

const isApiCompatible = (api: unknown | null): api is AddSectionActionApi =>
  Boolean(apiHasUniqueId(api) && apiHasParentApi(api) && apiCanExpandPanels(api.parentApi));

export class AddSectionAction implements Action<EmbeddableApiContext> {
  public readonly type = ACTION_ADD_SECTION;
  public readonly id = ACTION_ADD_SECTION;
  public order = 9;
  public grouping = [ADD_PANEL_ANNOTATION_GROUP];

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    return 'Section';
  }

  public getIconType({ embeddable }: EmbeddableApiContext) {
    return 'section';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    return true;
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
