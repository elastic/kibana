/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { AsyncLocalStorage } from 'async_hooks';
import type { KibanaExecutionContext } from '../../types';

/** @internal */
export interface KibanaServerExecutionContext {
  readonly requestId: string;
  readonly parentContext?: KibanaExecutionContext;
}

export interface IExecutionContext {
  startWith(context: KibanaServerExecutionContext): void;
  stop(): void;
  get(): KibanaServerExecutionContext | undefined;
}

export class ExecutionContextClient implements IExecutionContext {
  private readonly asyncLocalStorage = new AsyncLocalStorage<KibanaServerExecutionContext>();
  startWith(context: KibanaServerExecutionContext) {
    // we have to use enterWith since Hapi lifecycle model is built on event emitters.
    // therefore if we wrapped request handler in asyncLocalStorage.run(), we would lose context in other lifecycles.
    this.asyncLocalStorage.enterWith(context);
  }
  stop() {
    // @ts-expect-error "undefined" is not supported in type definitions, which is wrong
    this.asyncLocalStorage.enterWith(undefined);
  }
  get(): KibanaServerExecutionContext | undefined {
    return this.asyncLocalStorage.getStore();
  }
}
