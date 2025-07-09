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
import { apiCanAddNewPanel } from '@kbn/presentation-containers';
import { EmbeddableApiContext, initializeStateManager } from '@kbn/presentation-publishing';
import { ADD_PANEL_TRIGGER, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { UiActionsPublicStart } from '@kbn/ui-actions-plugin/public/plugin';
import type { BookState } from '../../../server';
import { embeddableExamplesGrouping } from '../embeddable_examples_grouping';
import { defaultBookState } from './default_book_state';
import { ADD_SAVED_BOOK_ACTION_ID } from './constants';
import { openSavedBookEditor } from './saved_book_editor';
import { BookEmbeddableState } from './types';
import { BOOK_EMBEDDABLE_TYPE } from '../../../common';

export const registerCreateSavedBookAction = (uiActions: UiActionsPublicStart, core: CoreStart) => {
  uiActions.registerAction<EmbeddableApiContext>({
    id: ADD_SAVED_BOOK_ACTION_ID,
    getIconType: () => 'folderClosed',
    grouping: [embeddableExamplesGrouping],
    isCompatible: async ({ embeddable }) => {
      return apiCanAddNewPanel(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiCanAddNewPanel(embeddable)) throw new IncompatibleActionError();
      const newBookStateManager = initializeStateManager<BookState>(
        defaultBookState,
        defaultBookState
      );

      const { savedObjectId } = await openSavedBookEditor({
        stateManager: newBookStateManager,
        parent: embeddable,
        isCreate: true,
        core,
      });

      embeddable.addNewPanel<BookEmbeddableState>({
        panelType: BOOK_EMBEDDABLE_TYPE,
        serializedState: {
          rawState: savedObjectId ? { savedObjectId } : newBookStateManager.getLatestState(),
        },
      });
    },
    getDisplayName: () =>
      i18n.translate('embeddableExamples.savedbook.addBookAction.displayName', {
        defaultMessage: 'Book',
      }),
  });
  uiActions.attachAction(ADD_PANEL_TRIGGER, ADD_SAVED_BOOK_ACTION_ID);
};
