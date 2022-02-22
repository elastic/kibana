/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Labels } from 'elastic-apm-node';
import { isEqual, isUndefined, omitBy } from 'lodash';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { CoreService, KibanaExecutionContext } from '../../types';

/** @public */
export interface ExecutionContextSetup {
  context$: Observable<KibanaExecutionContext>;
  set(c$: KibanaExecutionContext): void;
  get(): KibanaExecutionContext;
  clear(): void;
  /**
   * returns apm labels
   **/
  getAsLabels(): Labels;
  /**
   * merges the current global context with the specific event context
   **/
  withGlobalContext(context?: KibanaExecutionContext): KibanaExecutionContext;
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
  private context$: BehaviorSubject<KibanaExecutionContext> = new BehaviorSubject({});
  private appId?: string;
  private subscription: Subscription = new Subscription();
  private contract?: ExecutionContextSetup;

  public setup() {
    this.contract = {
      context$: this.context$.asObservable(),
      clear: () => {
        this.context$.next({});
      },
      set: (c: KibanaExecutionContext) => {
        const newVal = {
          ...this.context$.value,
          ...c,
        };
        if (!isEqual(newVal, this.context$.value)) {
          this.context$.next(newVal);
        }
      },
      get: () => {
        return this.context$.value;
      },
      getAsLabels: () => {
        const executionContext = this.mergeContext();
        return omitBy(
          {
            name: executionContext?.name,
            id: executionContext?.id,
            page: executionContext?.page,
          },
          isUndefined
        ) as Labels;
      },
      withGlobalContext: (context: KibanaExecutionContext) => {
        return this.mergeContext(context);
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

  private mergeContext(context: KibanaExecutionContext = {}): KibanaExecutionContext {
    return {
      name: this.appId,
      url: window.location.pathname,
      ...this.context$.value,
      ...context,
    };
  }
}
