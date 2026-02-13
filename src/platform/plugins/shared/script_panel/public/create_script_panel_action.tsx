/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { apiCanAddNewPanel } from '@kbn/presentation-containers';
import { ADD_PANEL_OTHER_GROUP } from '@kbn/embeddable-plugin/public';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { ScriptPanelSerializedState } from '../server';
import { ADD_SCRIPT_PANEL_ACTION_ID } from './constants';
import type { ScriptPanelApi } from './types';
import { SCRIPT_PANEL_EMBEDDABLE_TYPE } from '../common/constants';

export const createScriptPanelAction = (): ActionDefinition<EmbeddableApiContext> => ({
  id: ADD_SCRIPT_PANEL_ACTION_ID,
  grouping: [ADD_PANEL_OTHER_GROUP],
  order: 10,
  getIconType: () => 'editorCodeBlock',
  isCompatible: async ({ embeddable }) => apiCanAddNewPanel(embeddable),
  execute: async ({ embeddable }) => {
    if (!apiCanAddNewPanel(embeddable)) throw new IncompatibleActionError();
    await embeddable.addNewPanel<ScriptPanelSerializedState, ScriptPanelApi>(
      {
        panelType: SCRIPT_PANEL_EMBEDDABLE_TYPE,
        serializedState: {
          script_code: '',
        },
      },
      { displaySuccessMessage: true }
    );
  },
  getDisplayName: () =>
    i18n.translate('scriptPanel.addPanelAction.displayName', {
      defaultMessage: 'Script panel',
    }),
  getDisplayNameTooltip: () =>
    i18n.translate('scriptPanel.addPanelAction.tooltip', {
      defaultMessage: 'Add a sandboxed script panel that can run custom JavaScript code.',
    }),
});
