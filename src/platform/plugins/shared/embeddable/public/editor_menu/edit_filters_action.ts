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
  apiPublishesWritableUnifiedSearch,
  type PublishesWritableUnifiedSearch,
} from '@kbn/presentation-publishing';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { EDITOR_MENU_EDIT_FILTERS_ACTION } from './constants';
import type { EditorMenuActionContext } from './types';

export type EditFiltersActionApi = PublishesWritableUnifiedSearch;

const isApiCompatible = (api: unknown | null): api is EditFiltersActionApi =>
  apiPublishesWritableUnifiedSearch(api);

export class EditFiltersAction implements Action<EditorMenuActionContext> {
  public readonly type = EDITOR_MENU_EDIT_FILTERS_ACTION;
  public readonly id = EDITOR_MENU_EDIT_FILTERS_ACTION;
  public order = 10;

  public getIconType() {
    return 'filter';
  }

  public getDisplayName() {
    return i18n.translate('embeddableApi.editorMenu.editFiltersButtonLabel', {
      defaultMessage: 'Edit filters',
    });
  }

  public getDisplayNameTooltip() {
    return i18n.translate('embeddableApi.editorMenu.editFiltersButtonTooltip', {
      defaultMessage: 'Edit filters',
    });
  }

  public async isCompatible({ api, editor }: EditorMenuActionContext): Promise<boolean> {
    if (!isApiCompatible(api ?? null)) return false;
    return Boolean(editor.mountFiltersBody);
  }

  public async execute({ editor }: EditorMenuActionContext) {
    const { EditorFiltersFlyout } = await import('./editor_filters_flyout');
    editor.mountFiltersBody?.(EditorFiltersFlyout);
  }
}
