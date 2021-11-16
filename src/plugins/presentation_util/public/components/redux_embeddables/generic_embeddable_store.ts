/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { configureStore, EnhancedStore } from '@reduxjs/toolkit';
import { combineReducers, Reducer } from 'redux';

export interface InjectReducerProps<StateShape> {
  key: string;
  asyncReducer: Reducer<StateShape>;
}

type ManagedEmbeddableReduxStore = EnhancedStore & {
  asyncReducers: { [key: string]: Reducer<unknown> };
  injectReducer: <StateShape>(props: InjectReducerProps<StateShape>) => void;
};
const embeddablesStore = configureStore({ reducer: (state) => state }); // store with blank reducers

const managedEmbeddablesStore = embeddablesStore as ManagedEmbeddableReduxStore;
managedEmbeddablesStore.asyncReducers = {};

managedEmbeddablesStore.injectReducer = <StateShape>({
  key,
  asyncReducer,
}: InjectReducerProps<StateShape>) => {
  if (!managedEmbeddablesStore.asyncReducers[key]) {
    managedEmbeddablesStore.asyncReducers[key] = asyncReducer as Reducer<unknown>;
    managedEmbeddablesStore.replaceReducer(
      combineReducers({ ...managedEmbeddablesStore.asyncReducers })
    );
  }
};

/**
 * A managed Redux store which can be used with multiple embeddables at once. When a new embeddable is created at runtime,
 * all passed in reducers will be made into a slice, then combined into the store using combineReducers.
 */
export const getManagedEmbeddablesStore = () => managedEmbeddablesStore;
