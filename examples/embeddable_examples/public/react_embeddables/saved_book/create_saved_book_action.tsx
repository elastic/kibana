/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
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
import {
  BookByReferenceSerializedState,
  BookByValueSerializedState,
  BookSerializedState,
} from './types';

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

      const initialState: BookSerializedState = await (async () => {
        // if we're adding this to the library, we only need to return the by reference state.
        if (addToLibrary) {
          const savedBookId = await saveBookAttributes(
            undefined,
            serializeBookAttributes(newPanelStateManager)
          );
          return { savedBookId } as BookByReferenceSerializedState;
        }
        return {
          attributes: serializeBookAttributes(newPanelStateManager),
        } as BookByValueSerializedState;
      })();

      embeddable.addNewPanel<BookSerializedState>({
        panelType: SAVED_BOOK_ID,
        initialState,
      });
    },
    getDisplayName: () =>
      i18n.translate('embeddableExamples.savedbook.addBookAction.displayName', {
        defaultMessage: 'Book',
      }),
  });
  uiActions.attachAction('ADD_PANEL_TRIGGER', ADD_SAVED_BOOK_ACTION_ID);
};
