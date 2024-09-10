/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PanelPackage } from '@kbn/presentation-containers';
import { BehaviorSubject, first } from 'rxjs';
import { lastSavedStateSessionStorage } from './session_storage/last_saved_state';
import { unsavedChangesSessionStorage } from './session_storage/unsaved_changes';
import { BookApi, BookRuntimeState } from '../../react_embeddables/saved_book/types';

export function getPageApi() {
  const lastSavedState = lastSavedStateSessionStorage.load();
  let newPanelState: Partial<BookRuntimeState> | undefined;
  const hasEmbeddableState$ = new BehaviorSubject<boolean>(lastSavedState !== undefined);
  const bookApi$ = new BehaviorSubject<BookApi | undefined>(undefined);

  function untilEmbeddableLoaded(): BookApi | Promise<BookApi> {
    if (bookApi$.value) {
      return bookApi$.value;
    }

    return new Promise((resolve) => {
      bookApi$
        .pipe(first((bookApi) => bookApi !== undefined))
        .subscribe((bookApi) => resolve(bookApi!));
    });
  }

  return {
    componentApi: {
      setBookApi: (bookApi: BookApi) => bookApi$.next(bookApi),
      hasEmbeddableState$,
    },
    pageApi: {
      addNewPanel: async ({ panelType, initialState }: PanelPackage) => {
        newPanelState = initialState ?? {};
        hasEmbeddableState$.next(true);
        return await untilEmbeddableLoaded();
      },
      /**
       * return last saved embeddable state
       */
      getSerializedStateForChild: (childId: string) => {
        return lastSavedState;
      },
      /**
       * return previous session's unsaved changes for embeddable
       */
      getRuntimeStateForChild: (childId: string) => {
        return newPanelState ?? unsavedChangesSessionStorage.load();
      },
    },
  };
}
