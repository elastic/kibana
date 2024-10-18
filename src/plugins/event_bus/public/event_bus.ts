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
import { Slice } from '@reduxjs/toolkit';

export interface Action<T = any> {
  type: string;
  payload: T;
}

export class EventBus<S extends Slice> {
  public subject: BehaviorSubject<Action>;
  private slice: S;
  public actions: S['actions'];

  constructor(slice: S) {
    this.subject = new BehaviorSubject<Action>({ type: 'init', payload: null });
    this.slice = slice;
    this.actions = this.wrapActions(slice.actions);
  }

  // Subscribe to this event bus
  subscribe(cb: (state: ReturnType<S['reducer']>) => void) {
    return this.subject
      .pipe(scan(this.slice.reducer, this.slice.getInitialState()), distinctUntilChanged(isEqual))
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
