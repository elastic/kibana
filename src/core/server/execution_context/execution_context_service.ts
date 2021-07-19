/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { AsyncLocalStorage } from 'async_hooks';
import type { Subscription } from 'rxjs';

import type { CoreService, KibanaExecutionContext } from '../../types';
import type { CoreContext } from '../core_context';
import type { Logger } from '../logging';
import type { ExecutionContextConfigType } from './execution_context_config';

import {
  ExecutionContextContainer,
  IExecutionContextContainer,
  getParentContextFrom,
} from './execution_context_container';

/**
 * @public
 */
export interface KibanaServerExecutionContext extends Partial<KibanaExecutionContext> {
  requestId: string;
}

/**
 * @internal
 */
export interface IExecutionContext {
  getParentContextFrom(headers: Record<string, string>): KibanaExecutionContext | undefined;
  set(context: Partial<KibanaServerExecutionContext>): void;
  reset(): void;
  get(): IExecutionContextContainer | undefined;
}

/**
 * @internal
 */
export type InternalExecutionContextSetup = IExecutionContext;

/**
 * @internal
 */
export type InternalExecutionContextStart = IExecutionContext;

/**
 * @public
 */
export interface ExecutionContextSetup {
  /**
   * Stores the meta-data of a runtime operation.
   * Data are carried over all async operations automatically.
   * The sequential calls merge provided "context" object shallowly.
   **/
  set(context: Partial<KibanaServerExecutionContext>): void;
  /**
   * Retrieves an opearation meta-data for the current async context.
   **/
  get(): IExecutionContextContainer | undefined;
}

/**
 * @public
 */
export type ExecutionContextStart = ExecutionContextSetup;

export class ExecutionContextService
  implements CoreService<InternalExecutionContextSetup, InternalExecutionContextStart> {
  private readonly log: Logger;
  private readonly asyncLocalStorage: AsyncLocalStorage<IExecutionContextContainer>;
  private enabled = false;
  private configSubscription?: Subscription;

  constructor(private readonly coreContext: CoreContext) {
    this.log = coreContext.logger.get('execution_context');
    this.asyncLocalStorage = new AsyncLocalStorage<IExecutionContextContainer>();
  }

  setup(): InternalExecutionContextSetup {
    this.configSubscription = this.coreContext.configService
      .atPath<ExecutionContextConfigType>('execution_context')
      .subscribe((config) => {
        this.enabled = config.enabled;
      });

    return {
      getParentContextFrom,
      set: this.set.bind(this),
      reset: this.reset.bind(this),
      get: this.get.bind(this),
    };
  }

  start(): InternalExecutionContextStart {
    return {
      getParentContextFrom,
      set: this.set.bind(this),
      reset: this.reset.bind(this),
      get: this.get.bind(this),
    };
  }

  stop() {
    this.enabled = false;
    if (this.configSubscription) {
      this.configSubscription.unsubscribe();
      this.configSubscription = undefined;
    }
  }

  private set(context: KibanaServerExecutionContext) {
    if (!this.enabled) return;
    const prevValue = this.asyncLocalStorage.getStore();
    // merges context objects shallowly. repeats the deafult logic of apm.setCustomContext(ctx)
    const contextContainer = new ExecutionContextContainer({ ...prevValue?.toJSON(), ...context });
    // we have to use enterWith since Hapi lifecycle model is built on event emitters.
    // therefore if we wrapped request handler in asyncLocalStorage.run(), we would lose context in other lifecycles.
    this.asyncLocalStorage.enterWith(contextContainer);
    this.log.trace(`stored the execution context: ${contextContainer.toJSON()}`);
  }

  private reset() {
    if (!this.enabled) return;
    // @ts-expect-error "undefined" is not supported in type definitions, which is wrong
    this.asyncLocalStorage.enterWith(undefined);
  }

  private get(): IExecutionContextContainer | undefined {
    if (!this.enabled) return;
    return this.asyncLocalStorage.getStore();
  }
}
