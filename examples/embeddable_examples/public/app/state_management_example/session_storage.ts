/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedPanelState } from '@kbn/presentation-publishing';
import { BookEmbeddableState } from '../../../common';

const SAVED_STATE_SESSION_STORAGE_KEY =
  'kibana.examples.embeddables.stateManagementExample.savedState';
const UNSAVED_STATE_SESSION_STORAGE_KEY =
  'kibana.examples.embeddables.stateManagementExample.unsavedSavedState';
export const WEB_LOGS_DATA_VIEW_ID = '90943e30-9a47-11e8-b64d-95841ca0b247';

export const savedStateManager = {
  clear: () => sessionStorage.removeItem(SAVED_STATE_SESSION_STORAGE_KEY),
  set: (serializedState: SerializedPanelState<BookEmbeddableState>) =>
    sessionStorage.setItem(SAVED_STATE_SESSION_STORAGE_KEY, JSON.stringify(serializedState)),
  get: () => {
    const serializedStateJSON = sessionStorage.getItem(SAVED_STATE_SESSION_STORAGE_KEY);
    return serializedStateJSON ? JSON.parse(serializedStateJSON) : undefined;
  },
};

export const unsavedStateManager = {
  clear: () => sessionStorage.removeItem(UNSAVED_STATE_SESSION_STORAGE_KEY),
  set: (serializedState: SerializedPanelState<BookEmbeddableState>) =>
    sessionStorage.setItem(UNSAVED_STATE_SESSION_STORAGE_KEY, JSON.stringify(serializedState)),
  get: () => {
    const serializedStateJSON = sessionStorage.getItem(UNSAVED_STATE_SESSION_STORAGE_KEY);
    return serializedStateJSON ? JSON.parse(serializedStateJSON) : undefined;
  },
};
