/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import {
  apiCanAccessViewMode,
  apiPublishesDataViews,
  apiPublishesLocalUnifiedSearch,
  CanAccessViewMode,
  EmbeddableApiContext,
  getInheritedViewMode,
  HasParentApi,
  PublishesDataViews,
  PublishesWritableLocalUnifiedSearch,
  PublishesWritablePanelDescription,
  PublishesWritablePanelTitle,
} from '@kbn/presentation-publishing';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { openCustomizePanelFlyout } from './open_customize_panel';

export const ACTION_CUSTOMIZE_PANEL = 'ACTION_CUSTOMIZE_PANEL';

export type CustomizePanelActionApi = CanAccessViewMode &
  PublishesDataViews &
  Partial<
    PublishesWritableLocalUnifiedSearch &
      PublishesWritablePanelDescription &
      PublishesWritablePanelTitle &
      HasParentApi
  >;

export const isApiCompatibleWithCustomizePanelAction = (
  api: unknown | null
): api is CustomizePanelActionApi =>
  Boolean(apiCanAccessViewMode(api) && apiPublishesDataViews(api));

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
      getInheritedViewMode(embeddable) === 'edit' ||
      (apiPublishesLocalUnifiedSearch(embeddable) &&
        (embeddable.isCompatibleWithLocalUnifiedSearch?.() ?? true))
    );
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatibleWithCustomizePanelAction(embeddable)) throw new IncompatibleActionError();
    openCustomizePanelFlyout({ api: embeddable });
  }
}
