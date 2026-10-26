/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import type {
  SidebarStoreConfig,
  SetState,
  GetState,
  SidebarContext,
} from '@kbn/core-chrome-sidebar';

/** Minimal storage interface for sidebar stores */
export interface SidebarStorage {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
}

/** Live store instance - holds state and bound actions */
export interface LiveStore<TState, TActions> {
  getState: () => TState;
  getState$: () => Observable<TState>;
  actions: TActions;
}

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Create a live store instance from a store configuration.
 * Handles storage restore, Zod validation, BehaviorSubject creation, and action binding.
 */
export function createLiveStore<TState, TActions>(
  appId: string,
  config: SidebarStoreConfig<TState, TActions>,
  storage: SidebarStorage,
  context: SidebarContext
): LiveStore<TState, TActions> {
  // Load from storage, validate with schema
  const stored = storage.get<unknown>(appId);
  const parsed = config.schema.safeParse(stored ?? {});
  const initial = parsed.success ? parsed.data : config.schema.parse({});

  if (!parsed.success && isDev) {
    // eslint-disable-next-line no-console
    console.warn(`[Sidebar] Invalid stored state for '${appId}', using defaults:`, parsed.error);
  }

  const subject = new BehaviorSubject<TState>(initial);
  const state$ = subject.asObservable();

  const set: SetState<TState> = (partial) => {
    const current = subject.getValue();
    const update = typeof partial === 'function' ? partial(current) : partial;
    const next = { ...current, ...update } as TState;

    // Validate in dev mode
    if (isDev) {
      const result = config.schema.safeParse(next);
      if (!result.success) {
        // eslint-disable-next-line no-console
        console.warn(`[Sidebar] Invalid state for '${appId}':`, result.error);
      }
    }

    subject.next(next);
    storage.set(appId, next);
  };

  const get: GetState<TState> = () => subject.getValue();

  return {
    getState: get,
    getState$: () => state$,
    actions: config.actions(set, get, context),
  };
}
