/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';

/** Set state - accepts partial state or updater function */
export type SetState<TState> = (
  partial: Partial<TState> | ((state: TState) => Partial<TState>)
) => void;

/** Get current state */
export type GetState<TState> = () => TState;

/** Sidebar control passed to actions */
export interface SidebarContext {
  /** Open this sidebar app */
  open: () => void;
  /** Close sidebar */
  close: () => void;
  /** Check if this app is currently shown */
  isCurrent: () => boolean;
}

/** Store configuration - schema and actions factory */
export interface SidebarStoreConfig<TState, TActions> {
  schema: z.ZodType<TState>;
  actions: (set: SetState<TState>, get: GetState<TState>, sidebar: SidebarContext) => TActions;
  /** Type helpers for inference - never used at runtime */
  readonly types: { readonly state: TState; readonly actions: TActions };
}

/**
 * Create a sidebar store configuration with schema and actions.
 * The store is instantiated lazily when the app is first accessed.
 *
 * @example
 * ```typescript
 * const store = createSidebarStore({
 *   schema: z.object({ count: z.number().default(0) }),
 *   actions: (set, get, { open, close }) => ({
 *     increment: () => set((s) => ({ count: s.count + 1 })),
 *     openWithCount: (count: number) => { set({ count }); open(); },
 *   }),
 * });
 * ```
 */
export function createSidebarStore<TState, TActions>(config: {
  schema: z.ZodType<TState>;
  actions: (set: SetState<TState>, get: GetState<TState>, sidebar: SidebarContext) => TActions;
}): SidebarStoreConfig<TState, TActions> {
  return config as SidebarStoreConfig<TState, TActions>;
}
