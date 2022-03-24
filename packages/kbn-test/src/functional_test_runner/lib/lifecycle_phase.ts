/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';

const shuffle = <T>(arr: T[]) => arr.slice().sort(() => (Math.random() > 0.5 ? 1 : -1));

export type GetArgsType<T extends LifecyclePhase<any>> = T extends LifecyclePhase<infer X>
  ? X
  : never;

export class LifecyclePhase<Args extends readonly any[]> {
  private readonly handlers: Array<(...args: Args) => Promise<void> | void> = [];

  public triggered = false;

  private readonly beforeSubj: Rx.Subject<void>;
  public readonly before$: Rx.Observable<void>;

  private readonly afterSubj: Rx.Subject<void>;
  public readonly after$: Rx.Observable<void>;

  constructor(
    private readonly options: {
      singular?: boolean;
    } = {}
  ) {
    this.beforeSubj = new Rx.Subject<void>();
    this.before$ = this.beforeSubj.asObservable();

    this.afterSubj = this.options.singular ? new Rx.ReplaySubject<void>(1) : new Rx.Subject<void>();
    this.after$ = this.afterSubj.asObservable();
  }

  public add(fn: (...args: Args) => Promise<void> | void) {
    this.handlers.push(fn);
  }

  public addSub(sub: Rx.Subscription) {
    this.handlers.push(() => {
      sub.unsubscribe();
    });
  }

  public async trigger(...args: Args) {
    if (this.options.singular && this.triggered) {
      throw new Error(`singular lifecycle event can only be triggered once`);
    }

    this.triggered = true;

    this.beforeSubj.next(undefined);
    if (this.options.singular) {
      this.beforeSubj.complete();
    }

    // catch the first error but still execute all handlers
    let error: Error | undefined;

    // shuffle the handlers to prevent relying on their order
    await Promise.all(
      shuffle(this.handlers).map(async (fn) => {
        try {
          await fn(...args);
        } catch (_error) {
          if (!error) {
            error = _error;
          }
        }
      })
    );

    this.afterSubj.next(undefined);
    if (this.options.singular) {
      this.afterSubj.complete();
    }

    if (error) {
      throw error;
    }
  }
}
