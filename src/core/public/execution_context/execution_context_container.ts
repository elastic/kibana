/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { KibanaExecutionContext } from '../../types';

// Switch to the standard Baggage header
// https://github.com/elastic/apm-agent-rum-js/issues/1040
const BAGGAGE_HEADER = 'x-kbn-context';

// Maximum number of bytes per a single name-value pair allowed by w3c spec
// https://w3c.github.io/baggage/
export const BAGGAGE_MAX_PER_NAME_VALUE_PAIRS = 4096;

// a single character can use up to 4 bytes
const MAX_BAGGAGE_LENGTH = BAGGAGE_MAX_PER_NAME_VALUE_PAIRS / 4;

// Limits the header value to max allowed "baggage" header property name-value pair
// It will help us switch to the "baggage" header when it becomes the standard.
// The trimmed value in the logs is better than nothing.
function enforceMaxLength(header: string): string {
  return header.slice(0, MAX_BAGGAGE_LENGTH);
}

/**
 * @public
 */
export interface IExecutionContextContainer {
  toHeader: () => Record<string, string>;
  toJSON: () => Readonly<KibanaExecutionContext>;
}

export class ExecutionContextContainer implements IExecutionContextContainer {
  readonly #context: Readonly<KibanaExecutionContext>;
  constructor(context: Readonly<KibanaExecutionContext>) {
    this.#context = context;
  }
  private toString(): string {
    const value = JSON.stringify(this.#context);
    // escape content as the description property might contain non-ASCII symbols
    return enforceMaxLength(encodeURIComponent(value));
  }

  toHeader() {
    return { [BAGGAGE_HEADER]: this.toString() };
  }

  toJSON() {
    return this.#context;
  }
}
