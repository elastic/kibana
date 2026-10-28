/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Subject whose private field must stay on the author instance across RPC. */
export class ExposeSecret {
  #value: number;

  constructor(value: number) {
    this.#value = value;
  }

  add(amount: number): number {
    return this.#value + amount;
  }
}
