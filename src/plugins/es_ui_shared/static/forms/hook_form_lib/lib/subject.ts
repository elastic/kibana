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

type Listener<T> = (value: T) => void;

export interface Subscription {
  unsubscribe: () => void;
}

export class Subject<T> {
  private callbacks: Set<Listener<T>> = new Set();
  value: T;

  constructor(value: T) {
    this.value = value;
  }

  subscribe(fn: Listener<T>): Subscription {
    this.callbacks.add(fn);

    /**
     * We immediately call the function inside the subscribe so the consumer
     * receives the value immediately, withouth the need to wait for a change.
     * We wrap it inside a setTimeout so that is is executed asynchronously
     * and does not interfer with any logic right after the subscribe() call.
     */
    setTimeout(() => {
      fn(this.value);
    });

    const unsubscribe = () => this.callbacks.delete(fn);
    return {
      unsubscribe,
    };
  }

  next(value: T) {
    if (value !== this.value) {
      this.value = value;
      this.callbacks.forEach(fn => fn(value));
    }
  }
}
