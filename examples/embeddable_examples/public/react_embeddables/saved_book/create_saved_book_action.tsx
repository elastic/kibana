/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart, OverlayStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { UiActionsPublicStart } from '@kbn/ui-actions-plugin/public/plugin';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { v4 } from 'uuid';
import {
  ADD_SAVED_BOOK_ACTION_ID,
  ADD_SAVED_BOOK_BY_REFERENCE_ACTION_ID,
  SAVED_BOOK_ID,
} from './constants';
import { SavedBookEditor } from './saved_book_editor';
import { BookSerializedState, BookStateManager } from './types';

const storage = new Storage(localStorage);

export const registerCreateSavedBookAction = (uiActions: UiActionsPublicStart, core: CoreStart) => {
  uiActions.registerAction<EmbeddableApiContext>({
    id: ADD_SAVED_BOOK_ACTION_ID,
    getIconType: () => 'folderClosed',
    isCompatible: async ({ embeddable }) => {
      return apiIsPresentationContainer(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();
      const newPanelStateManager: BookStateManager = {
        bookTitle: new BehaviorSubject('Pillars of the earth'),
        authorName: new BehaviorSubject('Ken follett'),
        numberOfPages: new BehaviorSubject(973),
        bookDescription: new BehaviorSubject<string | undefined>(
          'A spellbinding epic set in 12th-century England, The Pillars of the Earth tells the story of the struggle to build the greatest Gothic cathedral the world has known.'
        ),
      };

      core.overlays.openFlyout(
        toMountPoint(<SavedBookEditor bookStateManager={newPanelStateManager} />, {
          theme: core.theme,
          i18n: core.i18n,
        })
      );

      embeddable.addNewPanel<BookSerializedState>({
        panelType: SAVED_BOOK_ID,
        initialState: {
          attributes: {
            bookTitle: newPanelStateManager.bookTitle.value,
            authorName: newPanelStateManager.authorName.value,
            numberOfPages: newPanelStateManager.numberOfPages.value,
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
