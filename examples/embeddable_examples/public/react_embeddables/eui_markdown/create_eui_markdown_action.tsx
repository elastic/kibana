/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { IncompatibleActionError, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { ADD_EUI_MARKDOWN_ACTION_ID, EUI_MARKDOWN_ID } from './constants';

// -----------------------------------------------------------------------------
// Create and register an action which allows this embeddable to be created from
// the dashboard toolbar context menu.
// -----------------------------------------------------------------------------
export const registerCreateEuiMarkdownAction = (uiActions: UiActionsStart) => {
  uiActions.registerAction<EmbeddableApiContext>({
    id: ADD_EUI_MARKDOWN_ACTION_ID,
    getIconType: () => 'editorCodeBlock',
    isCompatible: async ({ embeddable }) => {
      return apiIsPresentationContainer(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();
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
};
