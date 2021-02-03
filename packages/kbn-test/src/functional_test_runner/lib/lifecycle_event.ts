/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import * as Rx from 'rxjs';

export type GetArgsType<T extends LifecycleEvent<any>> = T extends LifecycleEvent<infer X>
  ? X
  : never;

export class LifecycleEvent<Args extends readonly any[]> {
  private readonly handlers: Array<(...args: Args) => Promise<void> | void> = [];

  private readonly beforeSubj = this.options.singular
    ? new Rx.BehaviorSubject(undefined)
    : new Rx.Subject<void>();
  public readonly before$ = this.beforeSubj.asObservable();

  private readonly afterSubj = this.options.singular
    ? new Rx.BehaviorSubject(undefined)
    : new Rx.Subject<void>();
  public readonly after$ = this.afterSubj.asObservable();

  constructor(
    private readonly options: {
      singular?: boolean;
    } = {}
  ) {}

  public add(fn: (...args: Args) => Promise<void> | void) {
    this.handlers.push(fn);
  }

  public async trigger(...args: Args) {
    if (this.beforeSubj.isStopped) {
      throw new Error(`singular lifecycle event can only be triggered once`);
    }

    this.beforeSubj.next(undefined);
    if (this.options.singular) {
      this.beforeSubj.complete();
    }

    try {
      await Promise.all(this.handlers.map(async (fn) => await fn(...args)));
    } finally {
      this.afterSubj.next(undefined);
      if (this.options.singular) {
        this.afterSubj.complete();
      }
    }
  }
}
