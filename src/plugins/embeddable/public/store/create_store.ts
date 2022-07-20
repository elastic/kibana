/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { debounce } from 'lodash';
import { combineReducers, Reducer, Store } from 'redux';
import { configureStore, ConfigureStoreOptions } from '@reduxjs/toolkit';
import { filter } from 'rxjs';
import reduceReducers from 'reduce-reducers';
import type { EmbeddableInput, IEmbeddable } from '../lib';
import { input } from './input_slice';

export interface State {
  input: EmbeddableInput;
}

const GENERIC_REDUCER = combineReducers({ input: input.reducer }) as Reducer<State>;

function createReducer(reducer?: ConfigureStoreOptions<State>['reducer']) {
  if (!reducer) {
    return GENERIC_REDUCER;
  }

  return reduceReducers(
    GENERIC_REDUCER,
    reducer instanceof Function ? reducer : combineReducers(reducer)
  ) as Reducer<State>;
}

export function createStore(
  embeddable: IEmbeddable,
  { reducer, ...options }: Partial<ConfigureStoreOptions<State>> = {}
): Store<State> {
  let isUpstreamUpdate = false;
  let isDownstreamUpdate = false;

  const store = configureStore({ ...options, reducer: createReducer(reducer) });
  const onUpdate = debounce(() => {
    isDownstreamUpdate = true;
    embeddable.updateInput(store.getState().input);
    isDownstreamUpdate = false;
  });
  const unsubscribe = store.subscribe(() => !isUpstreamUpdate && onUpdate());

  embeddable
    .getInput$()
    .pipe(filter(() => !isDownstreamUpdate))
    .subscribe({
      next: () => {
        isUpstreamUpdate = true;
        store.dispatch(input.actions.set(embeddable.getInput()));
        isUpstreamUpdate = false;
      },
      complete: unsubscribe,
    });

  return store;
}
