/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { EditorMenuActionContext } from '@kbn/embeddable-plugin/public';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import { VEGA_EMBEDDABLE_TYPE } from '../../common/constants';
import { VEGA_EDITOR_HELP_ACTION, VEGA_EDITOR_OPTIONS_ACTION } from '../constants';

export const getVegaEditorOptionsAction =
  (): UiActionsActionDefinition<EditorMenuActionContext> => ({
    id: VEGA_EDITOR_OPTIONS_ACTION,
    type: VEGA_EDITOR_OPTIONS_ACTION,
    order: 30,
    getIconType: () => 'gear',
    getDisplayName: () =>
      i18n.translate('visTypeVega.editor.vegaEditorOptionsButtonAriaLabel', {
        defaultMessage: 'Vega editor options',
      }),
    isCompatible: async ({ editor }) =>
      editor.type === VEGA_EMBEDDABLE_TYPE && Boolean(editor.toggleOptions),
    execute: async ({ anchor, editor }) => {
      if (anchor) editor.toggleOptions?.(anchor);
    },
  });

export const getVegaEditorHelpAction = (): UiActionsActionDefinition<EditorMenuActionContext> => ({
  id: VEGA_EDITOR_HELP_ACTION,
  type: VEGA_EDITOR_HELP_ACTION,
  order: 20,
  getIconType: () => 'question',
  getDisplayName: () =>
    i18n.translate('visTypeVega.editor.vegaHelpButtonAriaLabel', {
      defaultMessage: 'Vega help',
    }),
  isCompatible: async ({ editor }) =>
    editor.type === VEGA_EMBEDDABLE_TYPE && Boolean(editor.toggleHelp),
  execute: async ({ anchor, editor }) => {
    if (anchor) editor.toggleHelp?.(anchor);
  },
});
