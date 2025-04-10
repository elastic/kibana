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
import { map } from 'rxjs';
import { ACTION_EDIT_PANEL } from './constants';

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
      defaultMessage: 'Edit {value} configuration',
      values: {
        value: embeddable.getTypeDisplayName(),
      },
    });
  }

  public getCompatibilityChangesSubject({ embeddable }: EmbeddableApiContext) {
    return isApiCompatible(embeddable)
      ? getViewModeSubject(embeddable)?.pipe(map(() => undefined))
      : undefined;
  }

  public couldBecomeCompatible({ embeddable }: EmbeddableApiContext) {
    return isApiCompatible(embeddable);
  }

  public getIconType() {
    return 'pencil';
  }

  public async getHref({ embeddable }: EmbeddableApiContext): Promise<string | undefined> {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return await embeddable?.getEditHref?.();
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable) || !embeddable.isEditingEnabled()) return false;
    return getInheritedViewMode(embeddable) === 'edit';
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    await embeddable.onEdit();
  }
}
