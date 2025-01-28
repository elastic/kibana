/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

import {
  EmbeddableApiContext,
  CanAccessViewMode,
  apiCanAccessViewMode,
  getInheritedViewMode,
  getViewModeSubject,
  HasReadOnlyCapabilities,
  hasReadOnlyCapabilities,
} from '@kbn/presentation-publishing';
import {
  Action,
  FrequentCompatibilityChangeAction,
  IncompatibleActionError,
} from '@kbn/ui-actions-plugin/public';
import { ACTION_SHOW_CONFIG_PANEL } from './constants';

export type ShowConfigPanelActionApi = CanAccessViewMode & HasReadOnlyCapabilities;

const isApiCompatible = (api: unknown | null): api is ShowConfigPanelActionApi => {
  return hasReadOnlyCapabilities(api) && apiCanAccessViewMode(api);
};

export class ShowConfigPanelAction
  implements Action<EmbeddableApiContext>, FrequentCompatibilityChangeAction<EmbeddableApiContext>
{
  public readonly type = ACTION_SHOW_CONFIG_PANEL;
  public readonly id = ACTION_SHOW_CONFIG_PANEL;
  public order = 50;

  constructor() {}

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return i18n.translate('presentationPanel.action.showConfigPanel.displayName', {
      defaultMessage: 'Configuration',
      values: {
        value: embeddable.getTypeDisplayName(),
      },
    });
  }

  public subscribeToCompatibilityChanges(
    { embeddable }: EmbeddableApiContext,
    onChange: (isCompatible: boolean, action: Action<EmbeddableApiContext>) => void
  ) {
    if (!isApiCompatible(embeddable)) return;
    return getViewModeSubject(embeddable)?.subscribe((viewMode) => {
      onChange(
        viewMode === 'view' && isApiCompatible(embeddable) && embeddable.isReadOnlyEnabled(),
        this
      );
    });
  }

  public couldBecomeCompatible({ embeddable }: EmbeddableApiContext) {
    return isApiCompatible(embeddable);
  }

  public getIconType() {
    return 'gear';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable) || !embeddable.isReadOnlyEnabled()) return false;
    // check if the embeddable allows the read only mode even when the view mode is 'view'
    return getInheritedViewMode(embeddable) === 'view' && embeddable.isReadOnlyEnabled();
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    await embeddable.onShowConfig();
  }
}
