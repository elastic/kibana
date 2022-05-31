/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { createAction, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { ViewMode, isReferenceOrValueEmbeddable } from '@kbn/embeddable-plugin/public';
import { DASHBOARD_CONTAINER_TYPE } from '@kbn/dashboard-plugin/public';
import { BookEmbeddable, BOOK_EMBEDDABLE } from './book_embeddable';

interface ActionContext {
  embeddable: BookEmbeddable;
}

export const ACTION_ADD_BOOK_TO_LIBRARY = 'ACTION_ADD_BOOK_TO_LIBRARY';

export const createAddBookToLibraryAction = () =>
  createAction({
    getDisplayName: () =>
      i18n.translate('embeddableExamples.book.addToLibrary', {
        defaultMessage: 'Add Book To Library',
      }),
    id: ACTION_ADD_BOOK_TO_LIBRARY,
    type: ACTION_ADD_BOOK_TO_LIBRARY,
    order: 100,
    getIconType: () => 'folderCheck',
    isCompatible: async ({ embeddable }: ActionContext) => {
      return (
        embeddable.type === BOOK_EMBEDDABLE &&
        embeddable.getInput().viewMode === ViewMode.EDIT &&
        embeddable.getRoot().isContainer &&
        embeddable.getRoot().type !== DASHBOARD_CONTAINER_TYPE &&
        isReferenceOrValueEmbeddable(embeddable) &&
        !embeddable.inputIsRefType(embeddable.getInput())
      );
    },
    execute: async ({ embeddable }: ActionContext) => {
      if (!isReferenceOrValueEmbeddable(embeddable)) {
        throw new IncompatibleActionError();
      }
      const newInput = await embeddable.getInputAsRefType();
      embeddable.updateInput(newInput);
    },
  });
