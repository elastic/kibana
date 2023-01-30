/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export class Defer<T> {
  public readonly resolve!: (data: T) => void;
  public readonly reject!: (error: any) => void;
  public readonly promise: Promise<T> = new Promise<T>((resolve, reject) => {
    (this as any).resolve = resolve;
    (this as any).reject = reject;
  });
}

export const createDefer = <T>() => new Defer<T>();
