/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UnsavedChanges } from './types';

const UNSAVED_CHANGES_SESSION_STORAGE_KEY =
  'kibana.examples.embeddables.presentationContainerExample.unsavedChanges';

function load(): UnsavedChanges {
  const unsavedChanges = sessionStorage.getItem(UNSAVED_CHANGES_SESSION_STORAGE_KEY);
  return unsavedChanges ? JSON.parse(unsavedChanges) : {};
}

function save(unsavedChanges: UnsavedChanges) {
  sessionStorage.setItem(UNSAVED_CHANGES_SESSION_STORAGE_KEY, JSON.stringify(unsavedChanges));
}

export const unsavedChanges = {
  load,
  save,
};
