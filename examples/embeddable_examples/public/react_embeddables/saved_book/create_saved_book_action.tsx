/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { UiActionsPublicStart } from '@kbn/ui-actions-plugin/public/plugin';
import { v4 } from 'uuid';
import {
  ADD_SAVED_BOOK_ACTION_ID,
  ADD_SAVED_BOOK_BY_REFERENCE_ACTION_ID,
  SAVED_BOOK_ID,
} from './constants';
import { BookSerializedState } from './types';

const storage = new Storage(localStorage);

export const registerCreateSavedBookAction = (uiActions: UiActionsPublicStart) => {
  uiActions.registerAction<EmbeddableApiContext>({
    id: ADD_SAVED_BOOK_ACTION_ID,
    getIconType: () => 'folderClosed',
    isCompatible: async ({ embeddable }) => {
      return apiIsPresentationContainer(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();
      embeddable.addNewPanel<BookSerializedState>({
        panelType: SAVED_BOOK_ID,
        initialState: {
          attributes: {
            bookTitle: 'Pillars of the Earth',
            authorName: 'Ken Follett',
            numberOfPages: 973,
          },
        },
      });
    },
    getDisplayName: () =>
      i18n.translate('embeddableExamples.savedbook.addBookAction.displayName', {
        defaultMessage: 'Book',
      }),
  });
  uiActions.attachAction('ADD_PANEL_TRIGGER', ADD_SAVED_BOOK_ACTION_ID);

  uiActions.registerAction<EmbeddableApiContext>({
    id: ADD_SAVED_BOOK_BY_REFERENCE_ACTION_ID,
    getIconType: () => 'folderCheck',
    isCompatible: async ({ embeddable }) => {
      return apiIsPresentationContainer(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();
      const bookAttributes = {
        bookTitle: 'The Dispossessed',
        authorName: 'Ursula K. Le Guin',
        numberOfPages: 387,
      };
      const savedBookId = v4();
      storage.set(savedBookId, bookAttributes);
      embeddable.addNewPanel<BookSerializedState>({
        panelType: SAVED_BOOK_ID,
        initialState: {
          savedBookId,
        },
      });
    },
    getDisplayName: () =>
      i18n.translate('embeddableExamples.savedbook.addBookByReferenceAction.displayName', {
        defaultMessage: 'Book by reference',
      }),
  });
  uiActions.attachAction('ADD_PANEL_TRIGGER', ADD_SAVED_BOOK_BY_REFERENCE_ACTION_ID);
};
