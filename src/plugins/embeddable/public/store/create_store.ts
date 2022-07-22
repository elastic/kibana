/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { combineReducers, Reducer, Store, ReducersMapObject } from 'redux';
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
import type { Optional } from 'utility-types';
import type { IEmbeddable } from '../lib';
import { input } from './input_slice';
import { output } from './output_slice';

export interface State<E extends IEmbeddable = IEmbeddable> {
  input: E extends IEmbeddable<infer I, infer O> ? I : never;
  output: E extends IEmbeddable<infer I, infer O> ? O : never;
}

type CustomReducer<T extends State> = Reducer<T> | ReducersMapObject<Optional<T, keyof State>>;

interface CreateStoreOptions<S extends State> extends Omit<ConfigureStoreOptions<S>, 'reducer'> {
  reducer?: CustomReducer<S>;
}

function createReducer<S extends State>(reducer?: CustomReducer<S>): Reducer<S> {
  const generic = combineReducers<Pick<S, keyof State>>({
    input: input.reducer,
    output: output.reducer,
  }) as Reducer<S>;

  if (!reducer) {
    return generic;
  }

  const custom =
    reducer instanceof Function ? reducer : (combineReducers(reducer) as unknown as Reducer<S>);

  return reduceReducers(generic, custom) as Reducer<S>;
}

export function createStore<E extends IEmbeddable = IEmbeddable, S extends State<E> = State<E>>(
  embeddable: E,
  { reducer, ...options }: CreateStoreOptions<S> = {}
): Store<S> {
  const store = configureStore({ ...options, reducer: createReducer(reducer) });
  const state$ = new Observable<S>((subscriber) => {
    subscriber.add(store.subscribe(() => subscriber.next(store.getState())));
  });
  const input$ = embeddable.getInput$();
  const output$ = embeddable.getOutput$();

  let isUpstreamUpdate = false;
  let isDownstreamUpdate = false;

  state$
    .pipe(
      takeUntil(input$.pipe(last())),
      pluck('input'),
      distinctUntilChanged(),
      filter(() => !isUpstreamUpdate),
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
      pluck('output'),
      distinctUntilChanged(),
      filter(() => !isUpstreamUpdate),
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
