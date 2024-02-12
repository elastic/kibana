/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import {
  hasEditCapabilities,
  HasEditCapabilities,
  EmbeddableApiContext,
  CanAccessViewMode,
  apiCanAccessViewMode,
  getInheritedViewMode,
  getViewModeSubject,
} from '@kbn/presentation-publishing';
import {
  Action,
  FrequentCompatibilityChangeAction,
  IncompatibleActionError,
} from '@kbn/ui-actions-plugin/public';

export const ACTION_EDIT_PANEL = 'editPanel';

export type EditPanelActionApi = CanAccessViewMode & HasEditCapabilities;

const isApiCompatible = (api: unknown | null): api is EditPanelActionApi => {
  return hasEditCapabilities(api) && apiCanAccessViewMode(api);
};

export class EditPanelAction
  implements Action<EmbeddableApiContext>, FrequentCompatibilityChangeAction<EmbeddableApiContext>
{
  public readonly type = ACTION_EDIT_PANEL;
  public readonly id = ACTION_EDIT_PANEL;
  public order = 50;

  constructor() {}

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return i18n.translate('presentationPanel.action.editPanel.displayName', {
      defaultMessage: 'Edit {value}',
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
      if (viewMode === 'edit' && isApiCompatible(embeddable) && embeddable.isEditingEnabled()) {
        onChange(true, this);
        return;
      }
      onChange(false, this);
    });
  }

  public couldBecomeCompatible({ embeddable }: EmbeddableApiContext) {
    return isApiCompatible(embeddable);
  }

  public getIconType() {
    return 'pencil';
  }

  public async getHref({ embeddable }: EmbeddableApiContext): Promise<string | undefined> {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return embeddable?.getEditHref?.();
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable) || !embeddable.isEditingEnabled()) return false;
    return getInheritedViewMode(embeddable) === 'edit';
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    embeddable.onEdit();
  }
}
