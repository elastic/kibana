/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { AsyncLocalStorage } from 'async_hooks';
import apm from 'elastic-apm-node';
import { isUndefined, omitBy } from 'lodash';
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
 * @internal
 */
export interface IExecutionContext {
  getParentContextFrom(headers: Record<string, string>): KibanaExecutionContext | undefined;
  setRequestId(requestId: string): void;
  set(context: KibanaExecutionContext): void;
  /**
   * The sole purpose of this imperative internal API is to be used by the http service.
   * The event-based nature of Hapi server doesn't allow us to wrap a request handler with "withContext".
   * Since all the Hapi event lifecycle will lose the execution context.
   * Nodejs docs also recommend using AsyncLocalStorage.run() over AsyncLocalStorage.enterWith().
   * https://nodejs.org/api/async_context.html#async_context_asynclocalstorage_enterwith_store
   */
  get(): IExecutionContextContainer | undefined;
  withContext<R>(context: KibanaExecutionContext | undefined, fn: () => R): R;
  /**
   * returns serialized representation to send as a header
   **/
  getAsHeader(): string | undefined;
  /**
   * returns apm labels
   **/
  getAsLabels(): apm.Labels;
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
   * Keeps track of execution context while the passed function is executed.
   * Data are carried over all async operations spawned by the passed function.
   * The nested calls stack the registered context on top of each other.
   **/
  withContext<R>(context: KibanaExecutionContext | undefined, fn: (...args: any[]) => R): R;
  getAsLabels(): apm.Labels;
}

/**
 * @public
 */
export type ExecutionContextStart = ExecutionContextSetup;

export class ExecutionContextService
  implements CoreService<InternalExecutionContextSetup, InternalExecutionContextStart>
{
  private readonly log: Logger;
  private readonly contextStore: AsyncLocalStorage<IExecutionContextContainer>;
  private readonly requestIdStore: AsyncLocalStorage<{ requestId: string }>;
  private enabled = false;
  private configSubscription?: Subscription;

  constructor(private readonly coreContext: CoreContext) {
    this.log = coreContext.logger.get('execution_context');
    this.contextStore = new AsyncLocalStorage<IExecutionContextContainer>();
    this.requestIdStore = new AsyncLocalStorage<{ requestId: string }>();
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
      withContext: this.withContext.bind(this),
      setRequestId: this.setRequestId.bind(this),
      get: this.get.bind(this),
      getAsHeader: this.getAsHeader.bind(this),
      getAsLabels: this.getAsLabels.bind(this),
    };
  }

  start(): InternalExecutionContextStart {
    return {
      getParentContextFrom,
      set: this.set.bind(this),
      setRequestId: this.setRequestId.bind(this),
      withContext: this.withContext.bind(this),
      get: this.get.bind(this),
      getAsHeader: this.getAsHeader.bind(this),
      getAsLabels: this.getAsLabels.bind(this),
    };
  }

  stop() {
    this.enabled = false;
    if (this.configSubscription) {
      this.configSubscription.unsubscribe();
      this.configSubscription = undefined;
    }
  }

  private set(context: KibanaExecutionContext) {
    if (!this.enabled) return;
    const contextContainer = new ExecutionContextContainer(context);
    // we have to use enterWith since Hapi lifecycle model is built on event emitters.
    // therefore if we wrapped request handler in asyncLocalStorage.run(), we would lose context in other lifecycles.
    this.contextStore.enterWith(contextContainer);
    this.log.debug(JSON.stringify(contextContainer));
  }

  private withContext<R>(
    context: KibanaExecutionContext | undefined,
    fn: (...args: any[]) => R
  ): R {
    if (!this.enabled || !context) {
      return fn();
    }
    const parent = this.contextStore.getStore();
    const contextContainer = new ExecutionContextContainer(context, parent);
    this.log.debug(JSON.stringify(contextContainer));

    return this.contextStore.run(contextContainer, fn);
  }

  private setRequestId(requestId: string) {
    if (!this.enabled) return;
    this.requestIdStore.enterWith({ requestId });
  }

  private get(): IExecutionContextContainer | undefined {
    if (!this.enabled) return;
    return this.contextStore.getStore();
  }

  private getAsHeader(): string | undefined {
    if (!this.enabled) return;
    // requestId may not be present in the case of FakeRequest
    const requestId = this.requestIdStore.getStore()?.requestId ?? 'unknownId';
    const executionContext = this.contextStore.getStore()?.toString();
    const executionContextStr = executionContext ? `;kibana:${executionContext}` : '';

    return `${requestId}${executionContextStr}`;
  }

  private getAsLabels() {
    if (!this.enabled) return {};
    const executionContext = this.contextStore.getStore()?.toJSON();

    return omitBy(
      {
        name: executionContext?.name,
        id: executionContext?.id,
        page: executionContext?.page,
      },
      isUndefined
    );
  }
}
