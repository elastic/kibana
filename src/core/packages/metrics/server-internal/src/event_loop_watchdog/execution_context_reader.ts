/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EventLoopBlockExecutionContext } from '@kbn/core-metrics-server';
import { CONTEXT_READER_KEY, MAX_CONTEXT_FIELD_LENGTH } from './constants';

/**
 * The parts of an execution context that are sampled; a `KibanaExecutionContext` has them. The
 * contexts nested in it are not sampled: a block is counted against the outer one.
 */
export interface ReadableExecutionContext {
  readonly type?: string;
  readonly name?: string;
  readonly id?: string;
}

/** Returns the execution context of the code that is running, if it has one. */
export type ReadExecutionContext = () => ReadableExecutionContext | undefined;

const READER = Symbol.for(CONTEXT_READER_KEY);

const cap = (value: string | undefined): string | undefined =>
  value === undefined ? undefined : String(value).slice(0, MAX_CONTEXT_FIELD_LENGTH);

/** Copies the sampled fields, so a sample's size doesn't depend on what a context carries. */
const sample = ({ type, name, id }: ReadableExecutionContext): EventLoopBlockExecutionContext => ({
  type: cap(type),
  name: cap(name),
  id: cap(id),
});

/**
 * Installs the global function the watchdog worker calls through the inspector while the main
 * thread is blocked. The call runs inside the blocking code, so `read` returns that code's
 * execution context. It must stay synchronous, small and free of side effects.
 */
export const installExecutionContextReader = (read: ReadExecutionContext): void => {
  Object.defineProperty(globalThis, READER, {
    value: (): EventLoopBlockExecutionContext | null => {
      const context = read();
      return context ? sample(context) : null;
    },
    configurable: true,
    enumerable: false,
    writable: false,
  });
};

export const uninstallExecutionContextReader = (): void => {
  Reflect.deleteProperty(globalThis, READER);
};
