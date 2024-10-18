/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { distinctUntilChanged, scan, BehaviorSubject } from 'rxjs';
import { isEqual } from 'lodash';
import { Slice, CaseReducerActions } from '@reduxjs/toolkit';

export interface Action<T = any> {
  type: string;
  payload: T;
}

export class EventBus<
  Namespace extends string,
  State,
  Actions extends CaseReducerActions<any, Namespace>
> {
  public subject: BehaviorSubject<Action>;
  private reducer: (state: State, action: Action) => State;
  private initialState: State;
  public actions: Actions;

  constructor(slice: Slice) {
    this.subject = new BehaviorSubject<Action>({ type: 'init', payload: null });
    this.reducer = slice.reducer;
    this.initialState = slice.getInitialState();
    this.actions = this.wrapActions(slice.actions);
  }

  // Subscribe to this event bus
  subscribe(cb: (state: State) => void) {
    return this.subject
      .pipe(scan(this.reducer, this.initialState), distinctUntilChanged(isEqual))
      .subscribe(cb);
  }

  // Wrap actions to automatically dispatch through the event bus
  private wrapActions(actions: Actions): Actions {
    const wrappedActions: Partial<Actions> = {};
    for (const [key, actionCreator] of Object.entries(actions)) {
      wrappedActions[key as keyof Actions] = ((...args: any[]) => {
        const action = actionCreator(...args);
        this.subject.next(action);
      }) as any;
    }
    return wrappedActions as Actions;
  }
}
