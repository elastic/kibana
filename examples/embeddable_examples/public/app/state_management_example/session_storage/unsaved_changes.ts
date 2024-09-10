/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BookRuntimeState } from '../../../react_embeddables/saved_book/types';

const UNSAVED_CHANGES_SESSION_STORAGE_KEY =
  'kibana.examples.embeddables.stateManagementExample.unsavedChanges';

export const unsavedChangesSessionStorage = {
  clear: () => {
    sessionStorage.removeItem(UNSAVED_CHANGES_SESSION_STORAGE_KEY);
  },
  load: (): Partial<BookRuntimeState> | undefined => {
    const unsavedChanges = sessionStorage.getItem(UNSAVED_CHANGES_SESSION_STORAGE_KEY);
    return unsavedChanges ? JSON.parse(unsavedChanges) : undefined;
  },
  save: (unsavedChanges: Partial<BookRuntimeState>) => {
    sessionStorage.setItem(UNSAVED_CHANGES_SESSION_STORAGE_KEY, JSON.stringify(unsavedChanges));
  },
};
