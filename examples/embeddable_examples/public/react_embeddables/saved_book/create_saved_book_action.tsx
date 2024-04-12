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
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { UiActionsPublicStart } from '@kbn/ui-actions-plugin/public/plugin';
import { ADD_SAVED_BOOK_ACTION_ID, SAVED_BOOK_ID } from './constants';

export const registerCreateSavedBookAction = (uiActions: UiActionsPublicStart) => {
  uiActions.registerAction<EmbeddableApiContext>({
    id: ADD_SAVED_BOOK_ACTION_ID,
    getIconType: () => 'package',
    isCompatible: async ({ embeddable }) => {
      return apiIsPresentationContainer(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();
      embeddable.addNewPanel({
        panelType: SAVED_BOOK_ID,
      });
    },
    getDisplayName: () =>
      i18n.translate('embeddableExamples.savedbook.displayName', {
        defaultMessage: 'Book',
      }),
  });
  uiActions.attachAction('ADD_PANEL_TRIGGER', ADD_SAVED_BOOK_ACTION_ID);
};
