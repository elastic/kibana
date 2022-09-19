/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { chain, isEmpty, keys } from 'lodash';
import { combineReducers, Reducer, Store, ReducersMapObject } from 'redux';
import { configureStore, ConfigureStoreOptions } from '@reduxjs/toolkit';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  last,
  map,
  pluck,
  share,
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

export interface CreateStoreOptions<S extends State>
  extends Omit<ConfigureStoreOptions<S>, 'reducer'> {
  reducer?: Reducer<S> | Optional<ReducersMapObject<S>, keyof State>;
}

function createReducer<S extends State>(
  reducer?: CreateStoreOptions<S>['reducer']
): Reducer<S> | ReducersMapObject<S> {
  if (reducer instanceof Function) {
    const generic = combineReducers<Pick<S, keyof State>>({
      input: input.reducer,
      output: output.reducer,
    }) as Reducer<S>;

    return reduceReducers(generic, reducer) as Reducer<S>;
  }

  return {
    ...(reducer ?? {}),
    input: reducer?.input ? reduceReducers(input.reducer, reducer.input) : input.reducer,
    output: reducer?.output ? reduceReducers(output.reducer, reducer.output) : output.reducer,
  } as ReducersMapObject<S>;
}

function diff<T extends Record<keyof any, any>>(previous: T, current: T) {
  return chain(current)
    .keys()
    .concat(keys(previous))
    .uniq()
    .filter((key) => previous[key] !== current[key])
    .map((key) => [key, current[key]])
    .fromPairs()
    .value() as Partial<T>;
}

/**
 * Creates a Redux store for the given embeddable.
 * @param embeddable The embeddable instance.
 * @param options The custom options to pass to the `configureStore` call.
 * @returns The Redux store.
 */
export function createStore<E extends IEmbeddable = IEmbeddable, S extends State<E> = State<E>>(
  embeddable: E,
  { preloadedState, reducer, ...options }: CreateStoreOptions<S> = {}
): Store<S> {
  const store = configureStore({
    ...options,
    preloadedState: {
      input: embeddable.getInput(),
      output: embeddable.getOutput(),
      ...(preloadedState ?? {}),
    } as NonNullable<typeof preloadedState>,
    reducer: createReducer(reducer),
  });

  const state$ = new Observable<S>((subscriber) => {
    subscriber.add(store.subscribe(() => subscriber.next(store.getState())));
  }).pipe(share());
  const input$ = embeddable.getInput$();
  const output$ = embeddable.getOutput$();

  state$
    .pipe(
      takeUntil(input$.pipe(last())),
      pluck('input'),
      distinctUntilChanged(),
      map((value) => diff(embeddable.getInput(), value)),
      filter((patch) => !isEmpty(patch)),
      debounceTime(0)
    )
    .subscribe((patch) => embeddable.updateInput(patch));

  state$
    .pipe(
      takeUntil(output$.pipe(last())),
      pluck('output'),
      distinctUntilChanged(),
      map((value) => diff(embeddable.getOutput(), value)),
      filter((patch) => !isEmpty(patch)),
      debounceTime(0)
    )
    .subscribe((patch) => embeddable.updateOutput(patch));

  input$
    .pipe(
      map((value) => diff(store.getState().input, value)),
      filter((patch) => !isEmpty(patch))
    )
    .subscribe((patch) => store.dispatch(input.actions.update(patch)));

  output$
    .pipe(
      map((value) => diff(store.getState().output, value)),
      filter((patch) => !isEmpty(patch))
    )
    .subscribe((patch) => store.dispatch(output.actions.update(patch)));

  return store;
}
