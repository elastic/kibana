/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { initializeEditorMenuManager, type EditorMenuManager } from '@kbn/embeddable-plugin/public';
import { VEGA_EMBEDDABLE_TYPE } from '../../common/constants';
import { VEGA_EDITOR_HELP_ACTION, VEGA_EDITOR_OPTIONS_ACTION } from '../constants';
import { getVegaEditorHelpLabel, getVegaEditorOptionsLabel } from './editor_menu_actions';

export interface VegaEditorRenderParams {
  ariaLabelledBy: string;
  closeFlyout: () => void;
  isNewPanel: boolean;
  menuManager: EditorMenuManager;
}

/** Trailing actions for a Vega editor flyout, built before the editor module loads. */
export const createVegaEditorMenuManager = (
  flyoutType: 'push' | 'overlay' = 'push',
  api?: unknown
) =>
  initializeEditorMenuManager({
    api,
    editorType: VEGA_EMBEDDABLE_TYPE,
    flyoutType,
    // The add-panel flow builds this menu before the panel API exists. The button stays in the
    // flyout chrome, and `renderEditor` attaches the API once the panel is created.
    showFiltersAction: true,
    title: 'Vega',
    supportedMenus: ['options', 'help', 'filters'],
    menuActionIds: {
      options: VEGA_EDITOR_OPTIONS_ACTION,
      help: VEGA_EDITOR_HELP_ACTION,
    },
    menuLabels: {
      options: getVegaEditorOptionsLabel(),
      help: getVegaEditorHelpLabel(),
    },
  });
