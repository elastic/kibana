/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { IncompatibleActionError, ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/public';
import { UiActionsPublicStart } from '@kbn/ui-actions-plugin/public/plugin';
import { embeddableExamplesGrouping } from '../embeddable_examples_grouping';
import {
  defaultBookAttributes,
  serializeBookAttributes,
  stateManagerFromAttributes,
} from './book_state';
import { ADD_SAVED_BOOK_ACTION_ID, SAVED_BOOK_ID } from './constants';
import { openSavedBookEditor } from './saved_book_editor';
import { saveBookAttributes } from './saved_book_library';
import { BookRuntimeState } from './types';

export const registerCreateSavedBookAction = (uiActions: UiActionsPublicStart, core: CoreStart) => {
  uiActions.registerAction<EmbeddableApiContext>({
    id: ADD_SAVED_BOOK_ACTION_ID,
    getIconType: () => 'folderClosed',
    grouping: [embeddableExamplesGrouping],
    isCompatible: async ({ embeddable }) => {
      return apiIsPresentationContainer(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();
      const newPanelStateManager = stateManagerFromAttributes(defaultBookAttributes);

      const { addToLibrary } = await openSavedBookEditor(newPanelStateManager, true, core, {
        parentApi: embeddable,
      });

      const initialState: BookRuntimeState = await (async () => {
        const bookAttributes = serializeBookAttributes(newPanelStateManager);
        // if we're adding this to the library, we only need to return the by reference state.
        if (addToLibrary) {
          const savedBookId = await saveBookAttributes(undefined, bookAttributes);
          return { savedBookId, ...bookAttributes };
        }
        return bookAttributes;
      })();

      embeddable.addNewPanel<BookRuntimeState>({
        panelType: SAVED_BOOK_ID,
        initialState,
      });
    },
    getDisplayName: () =>
      i18n.translate('embeddableExamples.savedbook.addBookAction.displayName', {
        defaultMessage: 'Book',
      }),
  });
  uiActions.attachAction(ADD_PANEL_TRIGGER, ADD_SAVED_BOOK_ACTION_ID);
};
