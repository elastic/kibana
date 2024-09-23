/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import agent, { Logger } from 'elastic-apm-node';
import asyncHooks from 'async_hooks';

export interface SpanOptions {
  name: string;
  type?: string;
  subtype?: string;
  labels?: Record<string, string>;
  intercept?: boolean;
}

type Span = Exclude<typeof agent.currentSpan, undefined | null>;

export function parseSpanOptions(optionsOrName: SpanOptions | string) {
  const options = typeof optionsOrName === 'string' ? { name: optionsOrName } : optionsOrName;

  return options;
}

const runInNewContext = <T extends (...args: any[]) => any>(cb: T): ReturnType<T> => {
  const resource = new asyncHooks.AsyncResource('fake_async');

  return resource.runInAsyncScope(cb);
};

export async function withSpan<T>(
  optionsOrName: SpanOptions | string,
  cb: (span?: Span) => Promise<T>,
  logger?: Logger
): Promise<T> {
  const options = parseSpanOptions(optionsOrName);

  const { name, type, subtype, labels, intercept } = options;

  let time: number | undefined;
  if (logger?.isLevelEnabled('debug')) {
    time = performance.now();
  }

  function logTook() {
    if (time) {
      logger?.debug(
        () => `Operation ${name} took ${Math.round(performance.now() - time!) / 1000}s`
      );
    }
  }

  if (!agent.isStarted()) {
    return cb().finally(logTook);
  }

  let createdSpan: Span | undefined;

  // When a span starts, it's marked as the active span in its context.
  // When it ends, it's not untracked, which means that if a span
  // starts directly after this one ends, the newly started span is a
  // child of this span, even though it should be a sibling.
  // To mitigate this, we queue a microtask by awaiting a promise.
  if (!intercept) {
    await Promise.resolve();

    createdSpan = agent.startSpan(name) ?? undefined;

    if (!createdSpan) {
      return cb().finally(logTook);
    }
  }

  // If a span is created in the same context as the span that we just
  // started, it will be a sibling, not a child. E.g., the Elasticsearch span
  // that is created when calling search() happens in the same context. To
  // mitigate this we create a new context.

  return runInNewContext(() => {
    const promise = cb(createdSpan);

    let span: Span | undefined = createdSpan;

    if (intercept) {
      span = agent.currentSpan ?? undefined;
    }

    if (!span) {
      return promise;
    }

    const targetedSpan = span;

    if (name) {
      targetedSpan.name = name;
    }

    // @ts-ignore
    if (type) {
      targetedSpan.type = type;
    }
    if (subtype) {
      targetedSpan.subtype = subtype;
    }

    if (labels) {
      targetedSpan.addLabels(labels);
    }

    return promise
      .then((res) => {
        if (!targetedSpan.outcome || targetedSpan.outcome === 'unknown') {
          targetedSpan.outcome = 'success';
        }
        return res;
      })
      .catch((err) => {
        if (!targetedSpan.outcome || targetedSpan.outcome === 'unknown') {
          targetedSpan.outcome = 'failure';
        }
        throw err;
      })
      .finally(() => {
        targetedSpan.end();
        logTook();
      });
  });
}
