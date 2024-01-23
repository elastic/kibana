/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import {
  apiPublishesDataViews,
  apiPublishesLocalUnifiedSearch,
  apiPublishesViewMode,
  EmbeddableApiContext,
  PublishesDataViews,
  PublishesParentApi,
  PublishesViewMode,
  PublishesWritableLocalUnifiedSearch,
  PublishesWritablePanelDescription,
  PublishesWritablePanelTitle,
} from '@kbn/presentation-publishing';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { openCustomizePanelFlyout } from './open_customize_panel';

export const ACTION_CUSTOMIZE_PANEL = 'ACTION_CUSTOMIZE_PANEL';

export type CustomizePanelActionApi = PublishesViewMode &
  PublishesDataViews &
  Partial<
    PublishesWritableLocalUnifiedSearch &
      PublishesWritablePanelDescription &
      PublishesWritablePanelTitle &
      PublishesParentApi
  >;

export const isApiCompatibleWithCustomizePanelAction = (
  api: unknown | null
): api is CustomizePanelActionApi =>
  Boolean(apiPublishesViewMode(api) && apiPublishesDataViews(api));

export class CustomizePanelAction implements Action<EmbeddableApiContext> {
  public type = ACTION_CUSTOMIZE_PANEL;
  public id = ACTION_CUSTOMIZE_PANEL;
  public order = 40;

  constructor() {}

  public getDisplayName({ embeddable }: EmbeddableApiContext): string {
    return i18n.translate('presentationPanel.action.customizePanel.displayName', {
      defaultMessage: 'Panel settings',
    });
  }

  public getIconType() {
    return 'gear';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatibleWithCustomizePanelAction(embeddable)) return false;
    // It should be possible to customize just the time range in View mode
    return (
      embeddable.viewMode.value === 'edit' ||
      (apiPublishesLocalUnifiedSearch(embeddable) &&
        (embeddable.isCompatibleWithLocalUnifiedSearch?.() ?? true))
    );
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatibleWithCustomizePanelAction(embeddable)) throw new IncompatibleActionError();
    openCustomizePanelFlyout({ api: embeddable });
  }
}
