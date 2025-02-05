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
  apiHasParentApi,
  apiPublishesWritableViewMode,
  hasEditCapabilities,
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
    // check permissions to show a dynamic name
    const { write } = embeddable.isReadOnlyEnabled();
    return write
      ? i18n.translate('presentationPanel.action.editPanel.displayName', {
          defaultMessage: 'Edit {value} configuration',
          values: {
            value: embeddable.getTypeDisplayName(),
          },
        })
      : i18n.translate('presentationPanel.action.showConfigPanel.displayName', {
          defaultMessage: 'Show {value} configuration',
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
        viewMode === 'view' && isApiCompatible(embeddable) && embeddable.isReadOnlyEnabled().read,
        this
      );
    });
  }

  public couldBecomeCompatible({ embeddable }: EmbeddableApiContext) {
    return isApiCompatible(embeddable);
  }

  public getIconType({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    const { write } = embeddable.isReadOnlyEnabled();
    return write ? 'pencil' : 'glasses';
  }

  /**
   * The compatible check is scoped to the read only capabilities
   * Note: it does not take into account write permissions
   */
  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    return Boolean(
      isApiCompatible(embeddable) &&
        getInheritedViewMode(embeddable) === 'view' &&
        embeddable.isReadOnlyEnabled().read
    );
  }

  /**
   * The execute method contains a compatibility check with a wider scope
   * as it can detect permission and "hijack" the show action into an edit action
   * if the user can edit the panel
   */
  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    const { write } = embeddable.isReadOnlyEnabled();
    const currentViewMode = getInheritedViewMode(embeddable);
    const shouldChangeMode = write && currentViewMode !== 'edit';
    if (
      shouldChangeMode &&
      apiHasParentApi(embeddable) &&
      apiPublishesWritableViewMode(embeddable.parentApi) &&
      hasEditCapabilities(embeddable)
    ) {
      await embeddable.parentApi.setViewMode('edit');
      if (embeddable.isEditingEnabled()) {
        await embeddable.onEdit();
        return;
      }
      // if user has no edit capabilities once switched to edit mode,
      // restore the previous mode and show the config as read only
      await embeddable.parentApi.setViewMode(currentViewMode ?? 'view');
    }
    await embeddable.onShowConfig();
  }
}
