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

type Listener = (...args: any[]) => Promise<void> | void;
export type Lifecycle = ReturnType<typeof createLifecycle>;

export function createLifecycle() {
  const listeners = {
    beforeLoadTests: [] as Listener[],
    beforeTests: [] as Listener[],
    beforeTestSuite: [] as Listener[],
    beforeEachTest: [] as Listener[],
    afterTestSuite: [] as Listener[],
    testFailure: [] as Listener[],
    testHookFailure: [] as Listener[],
    cleanup: [] as Listener[],
    phaseStart: [] as Listener[],
    phaseEnd: [] as Listener[],
  };

  const cleanup$ = new Rx.ReplaySubject(1);

  return {
    cleanup$: cleanup$.asObservable(),

    on(name: keyof typeof listeners, fn: Listener) {
      if (!listeners[name]) {
        throw new TypeError(`invalid lifecycle event "${name}"`);
      }

      listeners[name].push(fn);
      return this;
    },

    async trigger(name: keyof typeof listeners, ...args: any[]) {
      if (!listeners[name]) {
        throw new TypeError(`invalid lifecycle event "${name}"`);
      }

      if (name === 'cleanup') {
        if (cleanup$.closed) {
          return;
        }

        cleanup$.next();
        cleanup$.complete();
      }

      try {
        if (name !== 'phaseStart' && name !== 'phaseEnd') {
          await this.trigger('phaseStart', name);
        }

        await Promise.all(listeners[name].map(async fn => await fn(...args)));
      } finally {
        if (name !== 'phaseStart' && name !== 'phaseEnd') {
          await this.trigger('phaseEnd', name);
        }
      }
    },
  };
}
