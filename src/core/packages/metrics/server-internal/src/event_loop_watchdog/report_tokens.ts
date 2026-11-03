/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** A rate limit: a burst of tokens, then one more per refill interval (D14). */
export class ReportTokens {
  private tokens: number;
  private lastRefillAt?: number;

  constructor(private readonly burst: number, private readonly refillMs: number) {
    this.tokens = burst;
  }

  public take(now: number): boolean {
    if (this.lastRefillAt === undefined) {
      this.lastRefillAt = now;
    } else {
      const refills = Math.floor((now - this.lastRefillAt) / this.refillMs);
      if (refills > 0) {
        this.tokens = Math.min(this.burst, this.tokens + refills);
        this.lastRefillAt += refills * this.refillMs;
      }
    }
    if (this.tokens <= 0) {
      return false;
    }
    this.tokens--;
    return true;
  }
}
