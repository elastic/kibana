/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { TracksOverlays } from '@kbn/presentation-containers';
import {
  apiCanAccessViewMode,
  apiPublishesDataViews,
  apiPublishesUnifiedSearch,
  apiPublishesPanelTitle,
  CanAccessViewMode,
  EmbeddableApiContext,
  getInheritedViewMode,
  HasParentApi,
  PublishesDataViews,
  PublishesWritableUnifiedSearch,
  PublishesWritablePanelDescription,
  PublishesWritablePanelTitle,
  PublishesUnifiedSearch,
} from '@kbn/presentation-publishing';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { openCustomizePanelFlyout } from './open_customize_panel';

export const ACTION_CUSTOMIZE_PANEL = 'ACTION_CUSTOMIZE_PANEL';

export type CustomizePanelActionApi = CanAccessViewMode &
  Partial<
    PublishesDataViews &
      PublishesWritableUnifiedSearch &
      PublishesWritablePanelDescription &
      PublishesWritablePanelTitle &
      HasParentApi<Partial<PublishesUnifiedSearch & TracksOverlays>>
  >;

export const isApiCompatibleWithCustomizePanelAction = (
  api: unknown | null
): api is CustomizePanelActionApi =>
  apiCanAccessViewMode(api) && (apiPublishesDataViews(api) || apiPublishesPanelTitle(api));

export class CustomizePanelAction implements Action<EmbeddableApiContext> {
  public type = ACTION_CUSTOMIZE_PANEL;
  public id = ACTION_CUSTOMIZE_PANEL;
  public order = 45;

  constructor() {}

  public getDisplayName({ embeddable }: EmbeddableApiContext): string {
    return i18n.translate('presentationPanel.action.customizePanel.displayName', {
      defaultMessage: 'Settings',
    });
  }

  public getIconType() {
    return 'gear';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatibleWithCustomizePanelAction(embeddable)) return false;
    // It should be possible to customize just the time range in View mode
    return (
      getInheritedViewMode(embeddable) === 'edit' ||
      (apiPublishesUnifiedSearch(embeddable) &&
        (embeddable.isCompatibleWithUnifiedSearch?.() ?? true))
    );
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatibleWithCustomizePanelAction(embeddable)) throw new IncompatibleActionError();
    openCustomizePanelFlyout({ api: embeddable });
  }
}
