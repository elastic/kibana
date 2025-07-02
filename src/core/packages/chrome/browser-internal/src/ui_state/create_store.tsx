/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// withRx.ts ---------------------------------------------------------------
import { auditTime, BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { unstable_batchedUpdates } from 'react-dom';
import type { StateCreator, StoreApi } from 'zustand/vanilla';
import { createStore } from 'zustand/vanilla';

/* -----------------------------------------------------------------------
   Types
------------------------------------------------------------------------ */

export type ObsMap = Record<string, Observable<unknown>>;

export type Combined<T extends ObsMap> = {
  [K in keyof T]: T[K] extends { getValue(): infer GV }
    ? GV
    : T[K] extends Observable<infer V>
    ? V | undefined
    : never;
};

/* -----------------------------------------------------------------------
   Middleware
------------------------------------------------------------------------ */
// ------------------ Runtime implementation -----------------------------
const withRx =
  <Streams extends ObsMap, S extends Combined<Streams>, Mapped = S>(
    streams: Streams,
    mapper?: (state: S) => Mapped
  ) =>
  (config: StateCreator<Mapped, [], []>): StateCreator<Mapped, [], []> =>
  (set, get, _api) => {
    /* 1. build the initial store state */
    const initial = config(set, get, _api);

    /* 2. wire the streams */
    const combined$ = combineLatest(streams);

    /* 3. push snapshots into the store */
    const store = _api;
    const sub = combined$.subscribe((snap) => {
      const mapped = mapper ? mapper(snap as S) : (snap as unknown as Mapped);
      unstable_batchedUpdates(() => store.setState(mapped, true));
    });

    type StoreWithDestroy = StoreApi<Mapped> & { destroy?: () => void };

    /* 4. enhanced destroy */
    const originalDestroy = (store as StoreWithDestroy).destroy;
    (store as StoreWithDestroy).destroy = () => {
      sub.unsubscribe();
      originalDestroy?.();
    };

    return initial;
  };

export interface ObservableStore<S> extends StoreApi<S> {
  destroy: () => void;
}

export interface ObservableStore<S> extends StoreApi<S> {
  destroy: () => void;
}

interface CreateUiStoreOptions<Streams extends ObsMap, Mapped> {
  mapper?: (state: Combined<Streams>) => Mapped;
}

export const createUiStoreFromObservables = <Streams extends ObsMap, Mapped = Combined<Streams>>(
  streams: Streams,
  options?: CreateUiStoreOptions<Streams, Mapped>
): ObservableStore<Mapped> => {
  const { mapper } = options || {};
  const getInitialState = () => {
    const initialState = Object.fromEntries(
      Object.entries(streams).map(([key, stream]) => [
        key,
        stream instanceof BehaviorSubject ? stream.getValue() : undefined,
      ])
    ) as Combined<Streams>;
    return mapper ? mapper(initialState) : (initialState as unknown as Mapped);
  };

  const store = createStore<Mapped>(
    withRx<Streams, Combined<Streams>, Mapped>(streams, mapper)(getInitialState)
  );
  return store as ObservableStore<Mapped>;
};
