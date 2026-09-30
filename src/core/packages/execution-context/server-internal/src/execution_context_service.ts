/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AsyncLocalStorage } from 'async_hooks';
import type apm from 'elastic-apm-node';
import { isUndefined, omitBy } from 'lodash';
import type { Subscription } from 'rxjs';

import type { Logger } from '@kbn/logging';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type { IExecutionContextContainer } from '@kbn/core-execution-context-server';
import type { ExecutionContextConfigType } from './execution_context_config';
import { ExecutionContextContainer, getParentContextFrom } from './execution_context_container';

/**
 * @internal
 */
export interface IExecutionContext {
  getParentContextFrom(
    headers: Record<string, string | string[] | undefined>
  ): KibanaExecutionContext | undefined;

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
 * Notified when `withContext` starts running a function; returns a callback invoked once that
 * function settles, or `undefined` when the context is not of interest. For contexts it opts
 * into, a thenable result is returned to the caller as a derived native promise.
 * @internal
 */
export type ExecutionContextActivityObserver = (
  context: KibanaExecutionContext
) => (() => void) | undefined;

/**
 * @internal
 */
export interface InternalExecutionContextSetup extends IExecutionContext {
  /** Registers the single process-wide observer of `withContext` activity (e.g. for diagnostics). */
  registerActivityObserver(observer: ExecutionContextActivityObserver): void;
}

/**
 * @internal
 */
export type InternalExecutionContextStart = IExecutionContext;

export class ExecutionContextService
  implements CoreService<InternalExecutionContextSetup, InternalExecutionContextStart>
{
  private readonly log: Logger;
  private readonly contextStore: AsyncLocalStorage<IExecutionContextContainer>;
  private readonly requestIdStore: AsyncLocalStorage<{ requestId: string }>;
  private enabled = false;
  private configSubscription?: Subscription;
  private activityObserver?: ExecutionContextActivityObserver;

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
      registerActivityObserver: (observer) => {
        if (this.activityObserver) {
          throw new Error('An execution context activity observer is already registered');
        }
        this.activityObserver = observer;
      },
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
    this.activityObserver = undefined;
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
    if (this.log.isLevelEnabled('debug')) {
      this.log.debug(JSON.stringify(contextContainer));
    }
  }

  private withContext<R>(
    context: KibanaExecutionContext | undefined,
    fn: (...args: any[]) => R
  ): R {
    const onActivityEnd = context ? this.activityObserver?.(context) : undefined;
    if (!onActivityEnd) {
      return this.runWithContext(context, fn);
    }

    try {
      const result = this.runWithContext(context, fn);
      if (!isThenable(result)) {
        onActivityEnd();
        return result;
      }
      // Return a derived native promise that re-throws, so that the activity ends when the result
      // settles and a rejection the caller drops is still reported as unhandled instead of being
      // swallowed by the bookkeeping. Callers of tracked contexts therefore receive a native
      // promise rather than the original object. This is intentional: only contexts the observer
      // opts into are affected (today Task Manager task runs and a few nested alerting contexts,
      // whose callers await the result from an async function), and any observer must keep that
      // property.
      return Promise.resolve(result).then(
        (value) => {
          onActivityEnd();
          return value;
        },
        (error) => {
          onActivityEnd();
          throw error;
        }
      ) as unknown as R;
    } catch (error) {
      // `onActivityEnd` is idempotent for the registry, so ending twice is harmless
      onActivityEnd();
      throw error;
    }
  }

  private runWithContext<R>(
    context: KibanaExecutionContext | undefined,
    fn: (...args: any[]) => R
  ): R {
    if (!this.enabled || !context) {
      return fn();
    }
    const parent = this.contextStore.getStore();
    const contextContainer = new ExecutionContextContainer(context, parent);
    if (this.log.isLevelEnabled('debug')) {
      this.log.debug(JSON.stringify(contextContainer));
    }

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

    // meta labels are only propagated server-side for APM transaction tracing
    const metaLabels = executionContext?.meta
      ? Object.entries(executionContext.meta).reduce((acc, [key, value]) => {
          acc[`kibana_meta_${key}`] = value;
          return acc;
        }, {} as Record<string, string | number | boolean | undefined>)
      : {};

    return omitBy(
      {
        name: executionContext?.name,
        id: executionContext?.id,
        page: executionContext?.page,
        ...metaLabels,
      },
      isUndefined
    );
  }
}

const isThenable = <T>(value: T): value is T & PromiseLike<Awaited<T>> =>
  typeof (value as Partial<PromiseLike<Awaited<T>>> | null | undefined)?.then === 'function';
