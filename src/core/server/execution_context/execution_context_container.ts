/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { KibanaServerExecutionContext } from './execution_context_service';
import type { KibanaExecutionContext } from '../../types';

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

export class ExecutionContextContainer {
  readonly #context: Readonly<KibanaServerExecutionContext>;
  constructor(context: Readonly<KibanaServerExecutionContext>) {
    this.#context = context;
  }
  toString(): string {
    const ctx = this.#context;
    const contextStringified = ctx.type && ctx.id ? `kibana:${ctx.type}:${ctx.id}` : '';
    return contextStringified ? `${ctx.requestId};${contextStringified}` : ctx.requestId;
  }
  toJSON(): Readonly<KibanaServerExecutionContext> {
    return this.#context;
  }
}
