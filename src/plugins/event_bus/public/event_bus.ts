/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import {
  distinctUntilChanged,
  map,
  scan,
  shareReplay,
  BehaviorSubject,
  type Observable,
  type Subscription,
} from 'rxjs';
import { isEqual } from 'lodash';
import { Slice } from '@reduxjs/toolkit';

/**
 * Check if a value is a JS primitive.
 * @param value
 * @returns whether the value is a JS primitive.
 */
export function isPrimitive(value: unknown) {
  return value === null || (typeof value !== 'object' && typeof value !== 'function');
}

/**
 * Custom isEqual function that handles NaN and delegates to lodash's isEqual for objects.
 * @param prev The previous value
 * @param curr The current value
 * @returns whether the two values are equal
 */
export function customIsEqual(prev: any, curr: any): boolean {
  if (isPrimitive(prev) && isPrimitive(curr)) {
    // Special handling for NaN
    if (typeof prev === 'number' && typeof curr === 'number') {
      return Object.is(prev, curr);
    }
    return prev === curr;
  } else {
    return isEqual(prev, curr);
  }
}

export interface Action<T = any> {
  type: string;
  payload: T;
}

export class EventBus<S extends Slice> {
  public subject: BehaviorSubject<Action>;
  public state: Observable<ReturnType<S['reducer']>>;
  public slice: S;
  public actions: S['actions'];
  // workaround for initialization in hook
  private currentState: ReturnType<S['reducer']>;
  private currentStateSubscription: Subscription;

  constructor(slice: S) {
    this.subject = new BehaviorSubject<Action>({ type: '', payload: null });
    this.state = this.subject.pipe(
      scan(slice.reducer, slice.getInitialState()),
      // make sure new subscribers get the latest state
      shareReplay(1)
    );
    this.slice = slice;
    this.actions = this.wrapActions(slice.actions);

    this.currentState = slice.getInitialState();
    this.currentStateSubscription = this.subscribe((state) => {
      this.currentState = state;
    });
  }

  // Subscribe to this event bus with an optional selector.
  subscribe<SelectedState = ReturnType<S['reducer']>>(
    cb: (state: SelectedState) => void,
    selector?: (state: ReturnType<S['reducer']>) => SelectedState
  ): Subscription {
    return this.state
      .pipe(
        // Apply selector if provided
        map((state) => (selector ? selector(state) : state)),
        // Emit only if the selected state has changed
        distinctUntilChanged(customIsEqual)
      )
      .subscribe(cb);
  }

  // React hook with an optional selector.
  useEventBusState<SelectedState = ReturnType<S['reducer']>>(
    selector?: (state: ReturnType<S['reducer']>) => SelectedState
  ): SelectedState {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const o$ = useMemo(
      () =>
        this.state.pipe(
          // Apply selector if provided
          map((state) => (selector ? selector(state) : state)),
          // Emit only if the selected state has changed
          distinctUntilChanged(customIsEqual)
        ),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    );

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const initialState = useMemo(
      () => (selector ? selector(this.currentState) : (this.currentState as SelectedState)),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    );

    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useObservable(o$, initialState);
  }

  // Wrap slice actions to automatically dispatch through the event bus
  private wrapActions(actions: S['actions']) {
    return Object.entries(actions).reduce((p, [key, actionCreator]) => {
      p[key as any as keyof S['actions']] = ((...args: any[]) => {
        const actionObj = actionCreator.apply(null, [args[0]]);
        this.subject.next(actionObj);
      }) as any;
      return p;
    }, {} as S['actions']);
  }

  // Call this method when unregistering the event bus to make sure
  // the state subscription is cleaned up.
  dispose() {
    this.subject.complete();
    this.currentStateSubscription.unsubscribe();
  }
}
