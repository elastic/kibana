/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { EmbeddableApiContext, apiCanAddNewPanel } from '@kbn/presentation-publishing';
import { ServerlessPluginStart } from '@kbn/serverless/public';
import { IncompatibleActionError, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { ADD_EUI_MARKDOWN_ACTION_ID, EUI_MARKDOWN_ID } from './constants';

// -----------------------------------------------------------------------------
// Create and register an action which allows this embeddable to be created from
// the dashboard toolbar context menu.
// -----------------------------------------------------------------------------
export const registerCreateEuiMarkdownAction = (
  uiActions: UiActionsStart,
  serverless?: ServerlessPluginStart
) => {
  uiActions.registerAction<EmbeddableApiContext>({
    id: ADD_EUI_MARKDOWN_ACTION_ID,
    getIconType: () => 'editorCodeBlock',
    isCompatible: async ({ embeddable }) => {
      return apiCanAddNewPanel(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiCanAddNewPanel(embeddable)) throw new IncompatibleActionError();
      embeddable.addNewPanel(
        {
          panelType: EUI_MARKDOWN_ID,
          initialState: { content: '# hello world!' },
        },
        true
      );
    },
    getDisplayName: () =>
      i18n.translate('embeddableExamples.euiMarkdownEditor.ariaLabel', {
        defaultMessage: 'EUI Markdown',
      }),
  });
  uiActions.attachAction('ADD_PANEL_TRIGGER', ADD_EUI_MARKDOWN_ACTION_ID);
  if (!serverless) {
    uiActions.attachAction('ADD_CANVAS_ELEMENT_TRIGGER', ADD_EUI_MARKDOWN_ACTION_ID);
  }
};
