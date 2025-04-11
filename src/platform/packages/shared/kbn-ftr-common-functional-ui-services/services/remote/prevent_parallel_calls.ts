/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

class Task<C, A, R> {
  public promise: Promise<R>;
  private resolve!: (result: R) => void;
  private reject!: (error: Error) => void;

  constructor(
    private readonly execQueue: Array<Task<C, A, R>>,
    private readonly fn: (this: C, arg: A) => Promise<R>,
    private readonly context: C,
    private readonly arg: A
  ) {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  public async exec() {
    try {
      this.resolve(await this.fn.call(this.context, this.arg));
    } catch (error) {
      this.reject(error);
    } finally {
      this.execQueue.shift();
      if (this.execQueue.length) {
        this.execQueue[0].exec();
      }
    }
  }
}

export function preventParallelCalls<C extends void, A, R>(
  fn: (this: C, arg: A) => Promise<R>,
  filter: (arg: A) => boolean
) {
  const execQueue: Array<Task<C, A, R>> = [];

  return async function (this: C, arg: A) {
    if (filter(arg)) {
      return await fn.call(this, arg);
    }

    const task = new Task(execQueue, fn, this, arg);
    if (execQueue.push(task) === 1) {
      // only item in the queue, kick it off
      task.exec();
    }

    return task.promise;
  };
}
