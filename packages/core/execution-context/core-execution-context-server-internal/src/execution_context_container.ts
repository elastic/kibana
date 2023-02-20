/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type { IExecutionContextContainer } from '@kbn/core-execution-context-server';

// Switch to the standard Baggage header. blocked by
// https://github.com/elastic/apm-agent-nodejs/issues/2102
export const BAGGAGE_HEADER = 'x-kbn-context';

export function getParentContextFrom(
  headers: Record<string, string>
): KibanaExecutionContext | undefined {
  const header = headers[BAGGAGE_HEADER];
  return parseHeader(header);
}

function parseHeader(header?: string): KibanaExecutionContext | undefined {
  if (!header) return undefined;
  try {
    return JSON.parse(decodeURIComponent(header));
  } catch (e) {
    return undefined;
  }
}

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

function stringify(ctx: KibanaExecutionContext): string {
  const encodeURIComponentIfNotEmpty = (val?: string) => encodeURIComponent(val || '');
  const stringifiedCtx = `${encodeURIComponentIfNotEmpty(ctx.type)}:${encodeURIComponentIfNotEmpty(
    ctx.name
  )}:${encodeURIComponentIfNotEmpty(ctx.id)}`;
  return ctx.child ? `${stringifiedCtx};${stringify(ctx.child)}` : stringifiedCtx;
}

/** get the sum of this context's circuit breaker and all child circuit breakers of type `breaker` */
function getCircuitBreaker(
  ctx: KibanaExecutionContext,
  breaker: keyof Required<KibanaExecutionContext>['circuitBreakers']
): number {
  return (
    (ctx.circuitBreakers ? ctx.circuitBreakers[breaker] : 0) +
    (ctx.child ? getCircuitBreaker(ctx.child, breaker) : 0)
  );
}

export class ExecutionContextContainer implements IExecutionContextContainer {
  readonly #context: KibanaExecutionContext;

  constructor(context: KibanaExecutionContext, parent?: IExecutionContextContainer) {
    this.#context = parent ? { ...parent.toJSON(), child: context } : context;
  }

  getCircuitBreaker(breaker: keyof Required<KibanaExecutionContext>['circuitBreakers']) {
    return getCircuitBreaker(this.#context, breaker);
  }

  incrementCircuitBreaker(breaker: keyof Required<KibanaExecutionContext>['circuitBreakers']) {
    if (this.#context.circuitBreakers === undefined) {
      this.#context.circuitBreakers = { requests: 0 };
    }
    return ++this.#context.circuitBreakers[breaker];
  }

  toString(): string {
    return enforceMaxLength(stringify(this.#context));
  }

  toJSON() {
    return this.#context;
  }
}
