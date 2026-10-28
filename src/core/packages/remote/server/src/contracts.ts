/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceToken } from '@kbn/core-di';

/** Backend selected by Core configuration. Callers register a graph, not a placement. */
export type RemoteBackend = 'worker_thread' | 'in_process';

export interface ScopeLookup {
  get<T>(scopeId: string): T;
}

export interface RemoteRegistration {
  readonly id: string;
  readonly root: ServiceToken<unknown>;
  readonly contributions: readonly ServiceToken<unknown>[];
  /** Executor providers this graph injects, such as its step catalogue. */
  readonly dependencies?: readonly ServiceToken<unknown>[];
}

export interface RemoteSession<T> {
  readonly stub: T;
  openScope(state: unknown): string;
  closeScope(scopeId: string): void;
  getScope<TState>(scopeId: string): TState;
}

/**
 * Public setup contract. `register` declares a graph. `bind` supplies a coordinator-side
 * implementation. `whenReady` resolves after Core has started that graph; plugin `start`
 * must not await it.
 *
 * @public
 */
export interface RemoteSetup {
  register(registration: RemoteRegistration): void;
  bind(token: ServiceToken<unknown>, factory: (scopes: ScopeLookup) => object): void;
  whenReady<T>(id: string): Promise<RemoteSession<T>>;
}
