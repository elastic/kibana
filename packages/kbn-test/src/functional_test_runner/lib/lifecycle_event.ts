/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
