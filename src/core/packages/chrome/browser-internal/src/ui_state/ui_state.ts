/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Observable } from 'rxjs';
import { ObservableStore, createUiStoreFromObservables, ObsMap, Combined } from './create_store';

export type ChromeUiStore = ObservableStore<ChromeUiState>;

export interface ChromeUiState {
  isVisible: boolean;
}

export interface ChromeUiStateObservableInput extends ObsMap {
  isVisible$: Observable<boolean>;
}

export function createChromeUiStore(observables: ChromeUiStateObservableInput): ChromeUiStore {
  const store = createUiStoreFromObservables(observables, {
    mapper: (state): ChromeUiState => ({
      isVisible: state.isVisible$ ?? false,
    }),
  });

  return store;
}
