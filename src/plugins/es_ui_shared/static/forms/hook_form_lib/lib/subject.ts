/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
     */
    fn(this.value);

    const unsubscribe = () => this.callbacks.delete(fn);
    return {
      unsubscribe,
    };
  }

  next(value: T) {
    if (value !== this.value) {
      this.value = value;
      this.callbacks.forEach((fn) => fn(value));
    }
  }
}
