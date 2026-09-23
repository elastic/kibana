/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import {
  initializeEditorMenuManager,
  type EditorMenuManager,
  type EditorMenuServices,
} from '@kbn/presentation-util';
import { EMBEDDABLE_EDITOR_MENU_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { triggers, type UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { VEGA_EMBEDDABLE_TYPE } from '../../common/constants';
import { VEGA_EDITOR_HELP_ACTION, VEGA_EDITOR_OPTIONS_ACTION } from '../constants';
import { getVegaEditorHelpLabel, getVegaEditorOptionsLabel } from './editor_menu_actions';

export interface VegaEditorRenderParams {
  ariaLabelledBy: string;
  closeFlyout: () => void;
  isNewPanel: boolean;
  menuManager: EditorMenuManager;
}

/** Action and notification services the editor menu manager calls back into. */
export const createVegaEditorMenuServices = (
  core: CoreStart,
  uiActions: Pick<UiActionsStart, 'getAction'>
): EditorMenuServices => ({
  getAction: async (id) => {
    const action = await uiActions.getAction(id);
    return {
      execute: (context) => action.execute(context as Parameters<typeof action.execute>[0]),
    };
  },
  notifications: {
    toasts: {
      addError: (error, options) => {
        core.notifications.toasts.addError(error, options);
      },
    },
  },
  trigger: triggers[EMBEDDABLE_EDITOR_MENU_TRIGGER],
});

/** Trailing actions for a Vega editor flyout, built before the editor module loads. */
export const createVegaEditorMenuManager = (services: EditorMenuServices, api?: unknown) =>
  initializeEditorMenuManager({
    services,
    api,
    editorType: VEGA_EMBEDDABLE_TYPE,
    title: 'Vega',
    supportedMenus: ['options', 'help'],
    menuActionIds: {
      options: VEGA_EDITOR_OPTIONS_ACTION,
      help: VEGA_EDITOR_HELP_ACTION,
    },
    menuLabels: {
      options: getVegaEditorOptionsLabel(),
      help: getVegaEditorHelpLabel(),
    },
  });
