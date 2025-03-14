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
import type { Slice, AnyAction, AsyncThunkAction } from '@reduxjs/toolkit';

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

export class EventBus<S extends Slice> {
  public subject: BehaviorSubject<AnyAction>;
  public state: Observable<ReturnType<S['reducer']>>;
  public slice: S;
  public actions: S['actions'];
  // workaround for initialization in hook
  private currentState: ReturnType<S['reducer']>;
  private currentStateSubscription: Subscription;
  private disposed = false;

  constructor(slice: S) {
    this.subject = new BehaviorSubject<AnyAction>({ type: '', payload: null });
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
    selector?: (state: ReturnType<S['reducer']>) => SelectedState,
    errorHandler?: (error: Error) => void
  ): Subscription {
    return this.state
      .pipe(
        // Apply selector if provided
        map((state) => (selector ? selector(state) : state)),
        // Emit only if the selected state has changed
        distinctUntilChanged(customIsEqual)
      )
      .subscribe({
        next: cb,
        // eslint-disable-next-line no-console
        error: errorHandler || console.error,
      });
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

  private wrapActions<A extends S['actions']>(actions: A): A {
    return Object.entries(actions).reduce((p, [key, actionCreator]) => {
      p[key as keyof A] = ((payload: any) => {
        const actionObj = actionCreator(payload);
        this.subject.next(actionObj);
      }) as A[keyof A];
      return p;
    }, {} as A);
  }

  dispatchOld<A extends AnyAction>(action: A) {
    this.subject.next(action);
  }

  // Dispatch method that can handle both regular actions and thunks.
  dispatch<ReturnType = any>(
    action: AnyAction | AsyncThunkAction<ReturnType, any, any>
  ): ReturnType extends void ? void : Promise<ReturnType> {
    // If it's a function (thunk), it needs the dispatch itself and getState
    if (typeof action === 'function') {
      // For thunks, we need to pass a properly typed dispatch function
      // along with getState and extra argument (if any)
      return action(this.dispatch.bind(this), this.getState.bind(this), undefined) as any;
    }

    // For regular actions, continue with your existing logic
    this.subject.next(action);
    return undefined as any;
  }

  getState() {
    return this.currentState;
  }

  // Call this method when unregistering the event bus to make sure
  // the state subscription is cleaned up.
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.subject.complete();
    this.currentStateSubscription.unsubscribe();
  }
}
