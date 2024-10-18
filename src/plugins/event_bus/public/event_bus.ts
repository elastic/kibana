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

export interface Action {
  type: string;
  payload: any;
}

export class EventBus {
  public subject: BehaviorSubject<any>;
  private reducer: any;
  private initialState: any;

  constructor(reducer: any, initialState: any) {
    this.subject = new BehaviorSubject<Action>({ type: 'init', payload: null });
    this.reducer = reducer;
    this.initialState = initialState;
  }

  // Dispatch an action to this event bus
  dispatch(action: Action) {
    this.subject.next(action);
  }

  // Subscribe to this event bus
  subscribe(cb: any) {
    return this.subject
      .pipe(scan(this.reducer, this.initialState), distinctUntilChanged(isEqual))
      .subscribe(cb);
  }
}
