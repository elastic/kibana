/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEqual } from 'lodash';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { CoreService } from '../../types';

export type ExecutionContext = Record<string, any>;

/** @public */
export interface ExecutionContextSetup {
  context$: Observable<ExecutionContext>;
  set(c$: ExecutionContext): void;
  getAll(): ExecutionContext;
  clear(): void;
}

/**
 * See {@link ExecutionContextSetup}.
 * @public
 */
export type ExecutionContextStart = ExecutionContextSetup;

export interface StartDeps {
  curApp$: Observable<string | undefined>;
}

/** @internal */
export class ExecutionContextService
  implements CoreService<ExecutionContextSetup, ExecutionContextStart>
{
  private context$: BehaviorSubject<ExecutionContext> = new BehaviorSubject({});
  private appId?: string;
  private subscription: Subscription = new Subscription();
  private contract?: ExecutionContextSetup;

  public setup() {
    this.contract = {
      context$: this.context$.asObservable(),
      clear: () => {
        this.context$.next({
          url: window.location.pathname,
          name: this.appId,
        });
      },
      set: (c: ExecutionContext) => {
        const newVal = {
          url: window.location.pathname,
          name: this.appId,
          ...this.context$.value,
          ...c,
        };
        if (!isEqual(newVal, this.context$.value)) {
          this.context$.next(newVal);
        }
      },
      getAll: () => {
        return this.context$.value;
      },
    };

    return this.contract;
  }

  public start({ curApp$ }: StartDeps) {
    const start = this.contract!;

    // Track app id changes and clear context on app change
    this.subscription.add(
      curApp$.subscribe((appId) => {
        this.appId = appId;
        start.clear();
      })
    );

    return start;
  }

  public stop() {
    this.subscription.unsubscribe();
  }
}
