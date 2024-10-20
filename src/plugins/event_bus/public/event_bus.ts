/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { distinctUntilChanged, map, scan, BehaviorSubject, type Subscription } from 'rxjs';
import { isEqual } from 'lodash';
import { Slice } from '@reduxjs/toolkit';

/**
 * Check if a value is a JS primitive.
 * @param value
 * @returns whether the value is a JS primitive.
 */
function isPrimitive(value: unknown) {
  return value === null || (typeof value !== 'object' && typeof value !== 'function');
}

/**
 * Custom isEqual function that handles NaN and delegates to lodash's isEqual for objects.
 * @param prev The previous value
 * @param curr The current value
 * @returns whether the two values are equal
 */
function customIsEqual(prev: any, curr: any): boolean {
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
  public slice: S;
  public actions: S['actions'];

  constructor(slice: S) {
    this.subject = new BehaviorSubject<Action>({ type: 'init', payload: null });
    this.slice = slice;
    this.actions = this.wrapActions(slice.actions);
  }

  // Subscribe to this event bus with an optional selector
  // without needing to provide the generic type.
  subscribe(cb: (state: ReturnType<S['reducer']>) => void): Subscription;
  subscribe(cb: (state: ReturnType<S['reducer']>) => void): Subscription;
  subscribe<SelectedState>(
    cb: (selectedState: SelectedState) => void,
    selector: (state: ReturnType<S['reducer']>) => SelectedState
  ): Subscription;
  subscribe<SelectedState = ReturnType<S['reducer']>>(
    cb: (state: SelectedState) => void,
    selector?: (state: ReturnType<S['reducer']>) => SelectedState
  ): Subscription {
    return this.subject
      .pipe(
        scan(this.slice.reducer, this.slice.getInitialState()),
        // Apply selector if provided
        map((state) => (selector ? selector(state) : state)),
        // Emit only if the selected state has changed
        distinctUntilChanged(customIsEqual)
      )
      .subscribe(cb);
  }

  // Wrap actions to automatically dispatch through the event bus
  private wrapActions(actions: S['actions']) {
    return Object.entries(actions).reduce((p, [key, actionCreator]) => {
      p[key as any as keyof S['actions']] = ((...args: any[]) => {
        const actionObj = actionCreator.apply(null, [args[0]]);
        this.subject.next(actionObj);
      }) as any;
      return p;
    }, {} as S['actions']);
  }
}
