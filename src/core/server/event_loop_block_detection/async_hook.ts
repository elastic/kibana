/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import apm from 'elastic-apm-node';
import { createHook, AsyncHook, AsyncLocalStorage } from 'async_hooks';
import { Logger } from '../logging';

interface CacheEntry {
  hrtime: [number, number];
  transaction: apm.Transaction | null;
  span: apm.Span | null;
}

interface LogWarningMeta {
  transaction?: {
    id: string;
    traceId: string;
    name: string;
    type: string | null;
    result: string | number;
  };

  span?: {
    id: string;
    traceId: string;
    name: string;
    type: string | null;
    subtype: string | null;
    action: string | null;
  };
}

export class EventLoopBlockDetectionAsyncHook {
  readonly #asyncHook: AsyncHook;
  readonly #asyncLocalStorage: AsyncLocalStorage<{ dontTrack: boolean }>;
  readonly #cache = new Map<number, CacheEntry>();
  readonly #logger: Logger;
  readonly #thresholdNs: number;

  constructor(thresholdMs: number, logger: Logger) {
    this.#asyncHook = createHook({ before: this.#before, after: this.#after });
    this.#asyncLocalStorage = new AsyncLocalStorage();
    this.#logger = logger;
    this.#thresholdNs = thresholdMs * 1e6;
  }

  enable() {
    this.#asyncHook.enable();
  }

  #after = (asyncId: number) => {
    const cached = this.#cache.get(asyncId);
    if (cached == null) {
      return;
    }
    this.#cache.delete(asyncId);

    const diff = process.hrtime(cached.hrtime);
    const diffNs = diff[0] * 1e9 + diff[1];
    if (diffNs > this.#thresholdNs) {
      const time = diffNs / 1e6;
      this.#asyncLocalStorage.run({ dontTrack: true }, () => {
        const meta: LogWarningMeta = {
          transaction: this.#formatTransaction(cached.transaction),
          span: this.#formatSpan(cached.span),
        };
        this.#logger.warn<LogWarningMeta>(
          this.#formatMessage(time, cached.transaction, cached.span),
          meta
        );
      });
    }
  };

  #before = (asyncId: number) => {
    if (this.#asyncLocalStorage.getStore()?.dontTrack) {
      return;
    }

    this.#cache.set(asyncId, {
      hrtime: process.hrtime(),
      transaction: apm.currentTransaction,
      span: apm.currentSpan,
    });
  };

  #formatMessage(blockMs: number, transaction: apm.Transaction | null, span: apm.Span | null) {
    const parameters = [
      this.#formatMessageParameter('transaction.name', transaction?.name),
      this.#formatMessageParameter('transaction.type', transaction?.type),
      this.#formatMessageParameter('transaction.result', transaction?.result),
      this.#formatMessageParameter('span.name', transaction?.name),
      this.#formatMessageParameter('span.type', transaction?.type),
      this.#formatMessageParameter('span.subtype', transaction?.subtype),
      this.#formatMessageParameter('span.action', span?.action),
      this.#formatMessageParameter('transaction.id', transaction?.ids['transaction.id']),
      this.#formatMessageParameter('transaction.traceId', transaction?.ids['trace.id']),
      this.#formatMessageParameter('span.id', span?.ids['span.id']),
      this.#formatMessageParameter('span.traceId', span?.ids['trace.id']),
    ];
    return `Event loop blocked for ${blockMs}ms. ${parameters.filter((p) => p != null).join(' ')}`;
  }

  #formatMessageParameter(paramName: string, paramValue: any) {
    if (paramValue == null) {
      return;
    }

    return `${paramName}="${paramValue}"`;
  }

  #formatSpan(span: apm.Span | null) {
    if (span == null) {
      return undefined;
    }

    return {
      id: span.ids['span.id'],
      traceId: span.ids['trace.id'],
      name: span.name,
      type: span.type,
      subtype: span.subtype,
      action: span.action,
      // _raw: span,
    };
  }

  #formatTransaction(transaction: apm.Transaction | null) {
    if (transaction == null) {
      return undefined;
    }

    return {
      id: transaction.ids['transaction.id'],
      traceId: transaction.ids['trace.id'],
      name: transaction.name,
      type: transaction.type,
      result: transaction.result,
      // _raw: transaction,
    };
  }
}
