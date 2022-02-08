/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEqual } from 'lodash';
import { BehaviorSubject, Observable } from 'rxjs';
import { CoreService } from '../../types';

export type ExecutionContext = Record<string, any>;
/** @public */
export interface ExecutionContextSetup {
  context$: Observable<ExecutionContext>;
  set(c$: Record<string, any>): void;
  getAll(): Record<string, any>;
  clear(): void;
}

/**
 * See {@link ExecutionContextSetup}.
 * @public
 */
export type ExecutionContextStart = ExecutionContextSetup;

/** @internal */
export class ExecutionContextService implements CoreService<ExecutionContextSetup, ExecutionContextStart> {
  // private context: Record<string, any> = {};
  private context$: BehaviorSubject<ExecutionContext> = new BehaviorSubject({});

  public setup() {
    return {
      context$: this.context$,
      clear: () => {
        this.context$.next({});
      },
      set: (c: ExecutionContext) => {
        const newVal = {
          ...this.context$.value,
          ...c
        };
        if (!isEqual(newVal, this.context$.value)) {
          this.context$.next({
            ...this.context$.value,
            ...c
          });
        }
      }, 
      getAll: () => {
        return this.context$.value;
      }
    };
  }

  public start() {
    return this.setup();
  }

  public stop() {
  }
}
