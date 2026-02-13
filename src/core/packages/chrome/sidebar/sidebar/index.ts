/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { ComponentType } from 'react';
import type { SidebarStoreConfig } from './src/create_sidebar_store';

// ============================================================================
// Store Types
// ============================================================================

export type {
  SetState,
  GetState,
  SidebarContext,
  SidebarStoreConfig,
} from './src/create_sidebar_store';
export { createSidebarStore } from './src/create_sidebar_store';

// ============================================================================
// App ID Types
// ============================================================================

/** Production sidebar app IDs */
export const VALID_SIDEBAR_APP_IDS = ['agentBuilder'] as const;

/** Prefix for example/test app IDs */
export const EXAMPLE_APP_ID_PREFIX = 'sidebarExample';

/** Valid sidebar app IDs: production apps or IDs starting with 'sidebarExample' */
export type SidebarAppId = (typeof VALID_SIDEBAR_APP_IDS)[number] | `sidebarExample${string}`;

/** Runtime validation for sidebar app IDs */
export function isValidSidebarAppId(appId: string): appId is SidebarAppId {
  // Check if it's in the explicit list
  if (VALID_SIDEBAR_APP_IDS.includes(appId as (typeof VALID_SIDEBAR_APP_IDS)[number])) {
    return true;
  }
  // Check if it starts with the example prefix
  if (appId.startsWith(EXAMPLE_APP_ID_PREFIX)) {
    return true;
  }
  return false;
}

/**
 * Props passed to sidebar app components.
 * - With store: receives state + actions + onClose
 * - Without store: receives only onClose
 */
export type SidebarComponentProps<
  TState = undefined,
  TActions = undefined
> = TState extends undefined
  ? { onClose: () => void }
  : { state: TState; actions: TActions; onClose: () => void };

/** Component type for sidebar apps */
export type SidebarComponentType<TState = undefined, TActions = undefined> = ComponentType<
  SidebarComponentProps<TState, TActions>
>;

/** Status of a sidebar app. */
export type SidebarAppStatus = 'available' | 'pending' | 'unavailable';

/** Config for sidebar app registration. `status` and `restoreOnReload` are optional with defaults. */
export interface SidebarAppConfig<TState = undefined, TActions = undefined> {
  /** Unique identifier */
  appId: SidebarAppId;
  /** App status. Defaults to `available`. Use the returned updater for async checks. */
  status?: SidebarAppStatus;
  /**
   * Whether to restore on page reload. Defaults to true.
   * Use as last resort. Apps should use store state for restoration.
   */
  restoreOnReload?: boolean;
  /** Async component loader */
  loadComponent: () => Promise<SidebarComponentType<TState, TActions>>;
  /**
   * Optional store for state management. Created via `createSidebarStore`.
   * If omitted, the app is stateless and only receives `onClose` prop.
   * State persists to localStorage.
   */
  store?: SidebarStoreConfig<TState, TActions>;
}

/** Complete app definition after registration, with defaults applied */
export type SidebarAppDefinition<TState = undefined, TActions = undefined> = SidebarAppConfig<
  TState,
  TActions
> & {
  status: SidebarAppStatus;
  restoreOnReload: boolean;
};

/** Sidebar app update payload */
export interface SidebarAppUpdate {
  /** App status. When omitted, status is unchanged. */
  status?: SidebarAppStatus;
}

/** Sidebar app updater returned from registration */
export type SidebarAppUpdater = (update: SidebarAppUpdate) => void;

/** Sidebar setup contract */
export interface SidebarSetup {
  /** Register a sidebar app */
  registerApp<TState = undefined, TActions = undefined>(
    app: SidebarAppConfig<TState, TActions>
  ): SidebarAppUpdater;
}

/**
 * App-bound API obtained via `sidebar.getApp(appId)`.
 * All methods are present regardless of whether the app has a store.
 * For stateless apps, `actions` is undefined and `getState()` returns undefined.
 */
export interface SidebarApp<TState = undefined, TActions = undefined> {
  /** Open sidebar to this app */
  open: () => void;
  /** Close sidebar */
  close: () => void;
  /** Bound actions to modify state. Undefined for stateless apps. */
  actions: TActions;
  /** Get current state. Returns undefined for stateless apps. */
  getState: () => TState;
  /** Observable of state. Emits undefined for stateless apps. */
  getState$: () => Observable<TState>;
  /** Current app status */
  getStatus: () => SidebarAppStatus;
  /** Observable of app status */
  getStatus$: () => Observable<SidebarAppStatus>;
}

/** Sidebar start contract */
export interface SidebarStart {
  /** Observable of open state */
  isOpen$: () => Observable<boolean>;
  /** Whether sidebar is open */
  isOpen: () => boolean;
  /** Close sidebar */
  close: () => void;
  /** Observable of width */
  getWidth$: () => Observable<number>;
  /** Get width */
  getWidth: () => number;
  /** Set width */
  setWidth: (width: number) => void;
  /** Observable of current app ID */
  getCurrentAppId$: () => Observable<SidebarAppId | null>;
  /** Get current app ID */
  getCurrentAppId: () => SidebarAppId | null;
  /** Check if app is registered */
  hasApp: (appId: SidebarAppId) => boolean;
  /** Get app-bound API */
  getApp: <TState = undefined, TActions = undefined>(
    appId: SidebarAppId
  ) => SidebarApp<TState, TActions>;
  /** Get app definition */
  getAppDefinition: (appId: SidebarAppId) => SidebarAppDefinition;
}
