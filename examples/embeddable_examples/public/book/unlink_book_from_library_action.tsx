/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { createAction, IncompatibleActionError } from '../../../../src/plugins/ui_actions/public';
import { BookEmbeddable, BOOK_EMBEDDABLE } from './book_embeddable';
import { ViewMode, isReferenceOrValueEmbeddable } from '../../../../src/plugins/embeddable/public';
import { DASHBOARD_CONTAINER_TYPE } from '../../../../src/plugins/dashboard/public';

interface ActionContext {
  embeddable: BookEmbeddable;
}

export const ACTION_UNLINK_BOOK_FROM_LIBRARY = 'ACTION_UNLINK_BOOK_FROM_LIBRARY';

export const createUnlinkBookFromLibraryAction = () =>
  createAction({
    getDisplayName: () =>
      i18n.translate('embeddableExamples.book.unlinkFromLibrary', {
        defaultMessage: 'Unlink Book from Library Item',
      }),
    id: ACTION_UNLINK_BOOK_FROM_LIBRARY,
    type: ACTION_UNLINK_BOOK_FROM_LIBRARY,
    order: 100,
    getIconType: () => 'folderExclamation',
    isCompatible: async ({ embeddable }: ActionContext) => {
      return (
        embeddable.type === BOOK_EMBEDDABLE &&
        embeddable.getInput().viewMode === ViewMode.EDIT &&
        embeddable.getRoot().isContainer &&
        embeddable.getRoot().type !== DASHBOARD_CONTAINER_TYPE &&
        isReferenceOrValueEmbeddable(embeddable) &&
        embeddable.inputIsRefType(embeddable.getInput())
      );
    },
    execute: async ({ embeddable }: ActionContext) => {
      if (!isReferenceOrValueEmbeddable(embeddable)) {
        throw new IncompatibleActionError();
      }
      const newInput = await embeddable.getInputAsValueType();
      embeddable.updateInput(newInput);
    },
  });
