/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { combineReducers, Reducer, Store } from 'redux';
import { configureStore, ConfigureStoreOptions } from '@reduxjs/toolkit';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  last,
  pluck,
  takeUntil,
  Observable,
} from 'rxjs';
import reduceReducers from 'reduce-reducers';
import type { EmbeddableInput, EmbeddableOutput, IEmbeddable } from '../lib';
import { input } from './input_slice';
import { output } from './output_slice';

export interface State {
  input: EmbeddableInput;
  output: EmbeddableOutput;
}

const GENERIC_REDUCER = combineReducers({
  input: input.reducer,
  output: output.reducer,
}) as Reducer<State>;

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
  const store = configureStore({ ...options, reducer: createReducer(reducer) });
  const state$ = new Observable<State>((subscriber) => {
    subscriber.add(store.subscribe(() => subscriber.next(store.getState())));
  });
  const input$ = embeddable.getInput$();
  const output$ = embeddable.getOutput$();

  let isUpstreamUpdate = false;
  let isDownstreamUpdate = false;

  state$
    .pipe(
      takeUntil(input$.pipe(last())),
      filter(() => !isUpstreamUpdate),
      pluck('input'),
      distinctUntilChanged(),
      debounceTime(0)
    )
    .subscribe((value) => {
      isDownstreamUpdate = true;
      embeddable.updateInput(value);
      isDownstreamUpdate = false;
    });

  state$
    .pipe(
      takeUntil(output$.pipe(last())),
      filter(() => !isUpstreamUpdate),
      pluck('output'),
      distinctUntilChanged(),
      debounceTime(0)
    )
    .subscribe((value) => {
      isDownstreamUpdate = true;
      embeddable.updateOutput(value);
      isDownstreamUpdate = false;
    });

  input$.pipe(filter(() => !isDownstreamUpdate)).subscribe((value) => {
    isUpstreamUpdate = true;
    store.dispatch(input.actions.set(value));
    isUpstreamUpdate = false;
  });

  output$.pipe(filter(() => !isDownstreamUpdate)).subscribe((value) => {
    isUpstreamUpdate = true;
    store.dispatch(output.actions.set(value));
    isUpstreamUpdate = false;
  });

  return store;
}
