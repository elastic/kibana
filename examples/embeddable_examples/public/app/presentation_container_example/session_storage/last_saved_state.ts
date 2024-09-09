/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LastSavedState } from '../types';

const SAVED_STATE_SESSION_STORAGE_KEY =
  'kibana.examples.embeddables.presentationContainerExample.savedState';

export const DEFAULT_STATE: LastSavedState = {
  timeRange: {
    from: 'now-15m',
    to: 'now',
  },
  panelsState: [],
};

export const lastSavedStateSessionStorage = {
  clear: () => {
    sessionStorage.removeItem(SAVED_STATE_SESSION_STORAGE_KEY);
  },
  load: (): LastSavedState => {
    const savedState = sessionStorage.getItem(SAVED_STATE_SESSION_STORAGE_KEY);
    return savedState ? JSON.parse(savedState) : { ...DEFAULT_STATE };
  },
  save: (state: LastSavedState) => {
    sessionStorage.setItem(SAVED_STATE_SESSION_STORAGE_KEY, JSON.stringify(state));
  },
};
