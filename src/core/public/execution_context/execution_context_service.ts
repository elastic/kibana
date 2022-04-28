/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEqual, isUndefined, omitBy } from 'lodash';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { CoreService, KibanaExecutionContext } from '../../types';

// Should be exported from elastic/apm-rum
export type LabelValue = string | number | boolean;

export interface Labels {
  [key: string]: LabelValue;
}

/**
 * Kibana execution context.
 * Used to provide execution context to Elasticsearch, reporting, performance monitoring, etc.
 * @public
 **/
export interface ExecutionContextSetup {
  /**
   * The current context observable
   **/
  context$: Observable<KibanaExecutionContext>;
  /**
   * Set the current top level context
   **/
  set(c$: KibanaExecutionContext): void;
  /**
   * Get the current top level context
   **/
  get(): KibanaExecutionContext;
  /**
   * clears the context
   **/
  clear(): void;
  /**
   * returns apm labels
   **/
  getAsLabels(): Labels;
  /**
   * merges the current top level context with the specific event context
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
        this.context$.next(this.getDefaultContext());
      },
      set: (c: KibanaExecutionContext) => {
        const newVal = this.mergeContext(c);
        if (!isEqual(newVal, this.context$.value)) {
          this.context$.next(newVal);
        }
      },
      get: () => {
        return this.mergeContext();
      },
      getAsLabels: () => {
        return this.removeUndefined({
          name: this.appId,
          id: this.context$.value?.id,
          page: this.context$.value?.page,
        }) as Labels;
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

  private removeUndefined(context: KibanaExecutionContext = {}) {
    return omitBy(context, isUndefined);
  }

  private getDefaultContext() {
    return {
      name: this.appId,
      url: window.location.pathname,
    };
  }

  private mergeContext(context: KibanaExecutionContext = {}): KibanaExecutionContext {
    return {
      ...this.getDefaultContext(),
      ...this.context$.value,
      ...context,
    };
  }
}
