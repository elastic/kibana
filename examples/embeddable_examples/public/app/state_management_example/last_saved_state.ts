/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SerializedPanelState } from '@kbn/presentation-containers';
import { BookSerializedState } from '../../react_embeddables/saved_book/types';

const SAVED_STATE_SESSION_STORAGE_KEY =
  'kibana.examples.embeddables.stateManagementExample.savedState';

export const lastSavedStateSessionStorage = {
  clear: () => {
    sessionStorage.removeItem(SAVED_STATE_SESSION_STORAGE_KEY);
  },
  load: (): SerializedPanelState<BookSerializedState> | undefined => {
    const savedState = sessionStorage.getItem(SAVED_STATE_SESSION_STORAGE_KEY);
    return savedState ? JSON.parse(savedState) : undefined;
  },
  save: (state: SerializedPanelState<BookSerializedState>) => {
    sessionStorage.setItem(SAVED_STATE_SESSION_STORAGE_KEY, JSON.stringify(state));
  },
};
