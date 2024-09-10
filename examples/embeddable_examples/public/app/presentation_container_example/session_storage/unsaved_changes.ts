/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UnsavedChanges } from '../types';

const UNSAVED_CHANGES_SESSION_STORAGE_KEY =
  'kibana.examples.embeddables.presentationContainerExample.unsavedChanges';

export const unsavedChangesSessionStorage = {
  clear: () => {
    sessionStorage.removeItem(UNSAVED_CHANGES_SESSION_STORAGE_KEY);
  },
  load: (): UnsavedChanges => {
    const unsavedChanges = sessionStorage.getItem(UNSAVED_CHANGES_SESSION_STORAGE_KEY);
    return unsavedChanges ? JSON.parse(unsavedChanges) : {};
  },
  save: (unsavedChanges: UnsavedChanges) => {
    sessionStorage.setItem(UNSAVED_CHANGES_SESSION_STORAGE_KEY, JSON.stringify(unsavedChanges));
  },
};
