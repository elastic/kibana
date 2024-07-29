/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** We .ceil to rather _slightly_ over-report usage in certain circumstances */
const twoDeci = (num: number) => Math.ceil(num * 100) / 100;

export class HistoryWindow {
  readonly #window: number[];
  readonly #size: number;

  constructor(size: number) {
    this.#size = size;
    this.#window = new Array(this.#size).fill(0);
  }

  public get size(): number {
    return this.#window.length;
  }

  addObservation(value: number) {
    this.#window.unshift(Math.max(0, value));
    this.#window.pop();
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
