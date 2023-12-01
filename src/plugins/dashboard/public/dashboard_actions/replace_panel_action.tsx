/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  apiIsPresentationContainer,
  PresentationContainer,
  TracksOverlays,
} from '@kbn/presentation-containers';
import {
  apiPublishesUniqueId,
  apiPublishesParentApi,
  apiPublishesViewMode,
  EmbeddableApiContext,
  PublishesUniqueId,
  PublishesPanelTitle,
  PublishesParentApi,
  PublishesViewMode,
} from '@kbn/presentation-publishing';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { ReplacePanelSOFinder } from '.';
import { openReplacePanelFlyout } from './open_replace_panel_flyout';
import { dashboardReplacePanelActionStrings } from './_dashboard_actions_strings';

export const ACTION_REPLACE_PANEL = 'replacePanel';

export type ReplacePanelActionApi = PublishesViewMode &
  PublishesUniqueId &
  Partial<PublishesPanelTitle> &
  PublishesParentApi<PresentationContainer & Partial<TracksOverlays>>;

const isApiCompatible = (api: unknown | null): api is ReplacePanelActionApi =>
  Boolean(
    apiPublishesUniqueId(api) &&
      apiPublishesViewMode(api) &&
      apiPublishesParentApi(api) &&
      apiIsPresentationContainer(api.parentApi.value)
  );

export class ReplacePanelAction implements Action<EmbeddableApiContext> {
  public readonly type = ACTION_REPLACE_PANEL;
  public readonly id = ACTION_REPLACE_PANEL;
  public order = 3;

  constructor(private savedObjectFinder: ReplacePanelSOFinder) {}

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return dashboardReplacePanelActionStrings.getDisplayName();
  }

  public getIconType({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return 'kqlOperand';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) return false;
    return embeddable.viewMode.value === 'edit';
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();

    openReplacePanelFlyout({
      api: embeddable,
      savedObjectFinder: this.savedObjectFinder,
    });
  }
}
