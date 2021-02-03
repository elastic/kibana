/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const oneSec = 1000;
const defMaxAge = 5 * oneSec;
/**
 * @internal
 */
export class Cache<T = Record<string, any>> {
  private value: T | null;
  private timer?: NodeJS.Timeout;

  /**
   * Delete cached value after maxAge ms.
   */
  constructor(private readonly maxAge: number = defMaxAge) {
    this.value = null;
  }
  get() {
    return this.value;
  }
  set(value: T) {
    this.del();
    this.value = value;
    this.timer = setTimeout(() => this.del(), this.maxAge);
  }
  del() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.value = null;
  }
}
