/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { COMMON_EMBEDDABLE_GROUPING } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { apiCanAddNewPanel } from '@kbn/presentation-containers';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import {
  ADD_PANEL_TRIGGER,
  IncompatibleActionError,
  UiActionsStart,
} from '@kbn/ui-actions-plugin/public';
import { ADD_MARKDOWN_ACTION_ID, MARKDOWN_ID } from './constants';
import { MarkdownEditorApi, MarkdownEditorSerializedState } from './types';

export const registerMarkdownActions = (uiActions: UiActionsStart) => {
  uiActions.registerAction<EmbeddableApiContext>({
    id: ADD_MARKDOWN_ACTION_ID,
    getIconType: () => 'visText',
    order: 50,
    grouping: [COMMON_EMBEDDABLE_GROUPING.annotation],
    isCompatible: async ({ embeddable }) => {
      return apiCanAddNewPanel(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiCanAddNewPanel(embeddable)) throw new IncompatibleActionError();
      const markdownApi = await embeddable.addNewPanel<
        MarkdownEditorSerializedState,
        MarkdownEditorApi
      >(
        {
          panelType: MARKDOWN_ID,
          initialState: { content: '' },
        },
        true
      );
      markdownApi?.onEdit();
    },
    getDisplayName: () =>
      i18n.translate('dashboardMarkdown.addDisplayName', {
        defaultMessage: 'Text',
      }),
  });
  uiActions.attachAction(ADD_PANEL_TRIGGER, ADD_MARKDOWN_ACTION_ID);
  if (uiActions.hasTrigger('ADD_CANVAS_ELEMENT_TRIGGER')) {
    // Because Canvas is not enabled in Serverless, this trigger might not be registered - only attach
    // the create action if the Canvas-specific trigger does indeed exist.
    uiActions.attachAction('ADD_CANVAS_ELEMENT_TRIGGER', ADD_MARKDOWN_ACTION_ID);
  }
};
