/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import agent from 'elastic-apm-node';
import asyncHooks from 'async_hooks';

export interface SpanOptions {
  name: string;
  type?: string;
  subtype?: string;
  labels?: Record<string, string>;
}

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
  cb: () => Promise<T>
): Promise<T> {
  const options = parseSpanOptions(optionsOrName);

  const { name, type, subtype, labels } = options;

  if (!agent.isStarted()) {
    return cb();
  }

  // When a span starts, it's marked as the active span in its context.
  // When it ends, it's not untracked, which means that if a span
  // starts directly after this one ends, the newly started span is a
  // child of this span, even though it should be a sibling.
  // To mitigate this, we queue a microtask by awaiting a promise.
  await Promise.resolve();

  const span = agent.startSpan(name);

  if (!span) {
    return cb();
  }

  // If a span is created in the same context as the span that we just
  // started, it will be a sibling, not a child. E.g., the Elasticsearch span
  // that is created when calling search() happens in the same context. To
  // mitigate this we create a new context.

  return runInNewContext(() => {
    // @ts-ignore
    if (type) {
      span.type = type;
    }
    if (subtype) {
      span.subtype = subtype;
    }

    if (labels) {
      span.addLabels(labels);
    }

    return cb()
      .then((res) => {
        span.outcome = 'success';
        return res;
      })
      .catch((err) => {
        span.outcome = 'failure';
        throw err;
      })
      .finally(() => {
        span.end();
      });
  });
}
