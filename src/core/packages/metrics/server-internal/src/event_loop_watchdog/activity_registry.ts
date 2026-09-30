/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type { KibanaRequest } from '@kbn/core-http-server';
import { sanitize } from './sanitize';
import type { Activity, NestedActivityKind } from './types';

const TASK_MANAGER_CONTEXT_TYPE = 'task manager';
const TASK_RUN_NAME_PREFIX = 'run ';

/**
 * Execution context types tracked as-is (`{ type, name, id }`), typically nested inside a task
 * run to say which unit of work it is busy with. Every caller creating one of these contexts must
 * await the result of `withContext` (see `ExecutionContextActivityObserver`).
 */
const NESTED_CONTEXT_TYPES: ReadonlySet<string> = new Set<NestedActivityKind>([
  // alerting rule executions, e.g. `{ name: 'execute .es-query', id: <rule id> }`
  'alert',
  // alerting v2 units of work, e.g. `{ name: 'dispatcher step', id: 'evaluate_matchers' }`
  'alerting_v2',
]);

const isNestedActivityKind = (type: string): type is NestedActivityKind =>
  NESTED_CONTEXT_TYPES.has(type);

/**
 * Maps an execution context to an allowlisted activity, or `undefined` when it is not tracked:
 * Task Manager task runs (`{ type: 'task manager', name: 'run <taskType>', id }`) and the nested
 * context types listed in `NESTED_CONTEXT_TYPES`.
 */
export const toActivity = (
  context: KibanaExecutionContext,
  now: number = Date.now()
): Activity | undefined => {
  const { type, name, id } = context;
  if (!type || !name || !id) return undefined;

  if (type === TASK_MANAGER_CONTEXT_TYPE) {
    if (!name.startsWith(TASK_RUN_NAME_PREFIX)) return undefined;
    return {
      kind: 'task',
      type: sanitize(name.slice(TASK_RUN_NAME_PREFIX.length)),
      id: sanitize(id),
      startedAt: now,
    };
  }

  if (isNestedActivityKind(type)) {
    return { kind: type, type: sanitize(name), id: sanitize(id), startedAt: now };
  }

  return undefined;
};

type HttpActivitySource = Pick<KibanaRequest, 'id'> & {
  route: Pick<KibanaRequest['route'], 'method' | 'routePath'>;
};

const UNKNOWN_ROUTE = 'unknown-route';

/** Maps an HTTP request to its method and route pattern (never the URL) and request id. */
export const toHttpActivity = (
  { id, route: { method, routePath = UNKNOWN_ROUTE } }: HttpActivitySource,
  now: number = Date.now()
): Activity => ({
  kind: 'http',
  type: sanitize(`${method.toUpperCase()} ${routePath}`),
  id: sanitize(id),
  startedAt: now,
});

export interface ActivityListener {
  onStart(key: number, activity: Activity): void;
  onEnd(key: number): void;
}

/**
 * Main-thread registry of in-flight activities. Always tracks (a map insert/delete per activity)
 * so that a newly started watchdog worker can be seeded with activities that started earlier.
 */
export class ActivityRegistry {
  private readonly active = new Map<number, Activity>();
  private nextKey = 0;
  private listener?: ActivityListener;

  /** Execution-context observer; see `ExecutionContextActivityObserver`. */
  public readonly observe = (context: KibanaExecutionContext): (() => void) | undefined => {
    const activity = toActivity(context);
    return activity ? this.track(activity) : undefined;
  };

  /** Tracks an activity until the returned (idempotent) callback is called. */
  public track(activity: Activity): () => void {
    const key = this.nextKey++;
    this.active.set(key, activity);
    this.listener?.onStart(key, activity);

    return () => {
      if (this.active.delete(key)) {
        this.listener?.onEnd(key);
      }
    };
  }

  /** Sets the listener and returns a snapshot of currently active activities. */
  public setListener(listener: ActivityListener | undefined): Array<[number, Activity]> {
    this.listener = listener;
    return [...this.active.entries()];
  }

  public get size(): number {
    return this.active.size;
  }
}
