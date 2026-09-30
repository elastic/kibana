/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import { sanitize } from './sanitize';
import type { Activity } from './types';

const TASK_MANAGER_CONTEXT_TYPE = 'task manager';
const TASK_RUN_NAME_PREFIX = 'run ';

/**
 * Maps an execution context to an allowlisted activity, or `undefined` when it is not tracked.
 * Only Task Manager task runs (`{ type: 'task manager', name: 'run <taskType>', id }`) for now.
 */
export const toActivity = (
  context: KibanaExecutionContext,
  now: number = Date.now()
): Activity | undefined => {
  const { type, name, id } = context;
  if (type !== TASK_MANAGER_CONTEXT_TYPE || !name?.startsWith(TASK_RUN_NAME_PREFIX) || !id) {
    return undefined;
  }
  return {
    kind: 'task',
    type: sanitize(name.slice(TASK_RUN_NAME_PREFIX.length)),
    id: sanitize(id),
    startedAt: now,
  };
};

export interface ActivityListener {
  onStart(key: number, activity: Activity): void;
  onEnd(key: number): void;
}

/**
 * Main-thread registry of in-flight activities. Always tracks (a map insert/delete per task
 * run) so that enabling the watchdog mid-flight can include activities that started earlier.
 */
export class ActivityRegistry {
  private readonly active = new Map<number, Activity>();
  private nextKey = 0;
  private listener?: ActivityListener;

  /** Execution-context observer; see `ExecutionContextActivityObserver`. */
  public readonly observe = (context: KibanaExecutionContext): (() => void) | undefined => {
    const activity = toActivity(context);
    if (!activity) return undefined;

    const key = this.nextKey++;
    this.active.set(key, activity);
    this.listener?.onStart(key, activity);

    return () => {
      if (this.active.delete(key)) {
        this.listener?.onEnd(key);
      }
    };
  };

  /** Sets the listener and returns a snapshot of currently active activities. */
  public setListener(listener: ActivityListener | undefined): Array<[number, Activity]> {
    this.listener = listener;
    return [...this.active.entries()];
  }

  public get size(): number {
    return this.active.size;
  }
}
