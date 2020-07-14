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

const shuffle = <T>(arr: T[]) => arr.slice().sort(() => (Math.random() > 0.5 ? 1 : -1));

export type GetArgsType<T extends LifecyclePhase<any>> = T extends LifecyclePhase<infer X>
  ? X
  : never;

export class LifecyclePhase<Args extends readonly any[]> {
  private readonly handlers: Array<(...args: Args) => Promise<void> | void> = [];

  public triggered = false;

  private readonly beforeSubj = new Rx.Subject<void>();
  public readonly before$ = this.beforeSubj.asObservable();

  private readonly afterSubj = this.options.singular
    ? new Rx.ReplaySubject<void>(1)
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
