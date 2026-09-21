/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import { EDITOR_MENU_EDIT_FILTERS_ACTION } from './constants';
import type { EditorMenuActionContext } from './types';

export const getEditFiltersAction = (): UiActionsActionDefinition<EditorMenuActionContext> => ({
  id: EDITOR_MENU_EDIT_FILTERS_ACTION,
  type: EDITOR_MENU_EDIT_FILTERS_ACTION,
  order: 10,
  getIconType: () => 'filter',
  getDisplayName: () =>
    i18n.translate('embeddableApi.editorMenu.editFiltersButtonLabel', {
      defaultMessage: 'Edit filters',
    }),
  getDisplayNameTooltip: () =>
    i18n.translate('embeddableApi.editorMenu.editFiltersButtonTooltip', {
      defaultMessage: 'Edit filters',
    }),
  isCompatible: async ({ editor }) => Boolean(editor.openFilters),
  execute: async ({ anchor, editor }) => {
    if (anchor) editor.openFilters?.(anchor);
  },
});
