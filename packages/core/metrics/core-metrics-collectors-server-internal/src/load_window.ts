/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import assert from 'node:assert';

/** We .ciel to rather _slightly_ over-report usage in certain circumstances */
const twoDeci = (num: number) => Math.ceil(num * 100) / 100;

export class LoadWindow {
  readonly #window: number[];

  constructor(private readonly size: number) {
    this.#window = new Array(size).fill(0);
  }

  addObservation(value: number) {
    this.#window.unshift(Math.max(0, value));
    this.#window.pop();
    assert(
      this.#window.length === this.size,
      `Expected window size of ${this.size}, but received ${this.#window.length}`
    );
  }

  /**
   * @param includeObservations number of observations to include in calculation. Will be normalized to be within the window size.
   */
  getAverage(includeObservations: number) {
    includeObservations = Math.min(Math.max(1, includeObservations), this.size);
    return twoDeci(
      this.#window.slice(0, includeObservations).reduce((acc, val) => acc + val, 0) /
        includeObservations
    );
  }
}
