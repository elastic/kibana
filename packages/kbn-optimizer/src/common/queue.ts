/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Defer } from './defer';

export class Queue<X> {
  private backlog: Array<{ fn: () => Promise<X>; defer: Defer<X> }> = [];
  private active = 0;

  constructor(private readonly concurrencyLimit: number) {}

  run(fn: () => Promise<X>) {
    const defer = new Defer<X>();

    if (this.active < this.concurrencyLimit) {
      this.exec(fn, defer);
    } else {
      this.backlog.push({ fn, defer });
    }

    return defer.promise;
  }

  private exec(fn: () => Promise<X>, defer: Defer<X>) {
    (async () => {
      this.active += 1;

      try {
        defer.resolve(await fn());
      } catch (error) {
        defer.reject(error);
      }

      this.active -= 1;

      const next = this.backlog.shift();
      if (next) {
        this.exec(next.fn, next.defer);
      }
    })();
  }
}
