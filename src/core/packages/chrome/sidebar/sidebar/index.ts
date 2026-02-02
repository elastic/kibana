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
import type { z } from '@kbn/zod/v4';

/** Production sidebar app IDs */
export const VALID_SIDEBAR_APP_IDS = [] as const;

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

/** Props passed to sidebar app components */
export interface SidebarComponentProps<TParams = {}> {
  /** Current params */
  params: TParams;
  /** Update params (merges with existing, persists to localStorage) */
  setParams: (params: Partial<TParams>) => void;
  /** Close the sidebar */
  onClose: () => void;
}

export type SidebarComponentType<TParams = {}> = ComponentType<SidebarComponentProps<TParams>>;

/** App definition for sidebar registration */
export interface SidebarAppDefinition<TParams = {}> {
  /** Unique identifier */
  appId: SidebarAppId;
  /** Whether available. Defaults to true. Use `setAvailable()` for async checks. */
  available?: boolean;
  /**
   * Whether to restore on page reload. Defaults to true.
   * @deprecated Use as last resort. Apps should use `params` for state restoration.
   */
  restoreOnReload?: boolean;
  /** Async component loader */
  loadComponent: () => Promise<SidebarComponentType<TParams>>;
  /**
   * Returns Zod schema for params structure and defaults.
   * If omitted, params is empty and setParams throws.
   * Use `.default()` on fields. Params persist to localStorage.
   *
   * @example
   * ```typescript
   * import { z } from '@kbn/zod/v4';
   *
   * const getMyParamsSchema = () => z.object({
   *   userName: z.string().default(''),
   *   count: z.number().default(0),
   * });
   *
   * type MyParams = z.infer<ReturnType<typeof getMyParamsSchema>>;
   *
   * registerApp<MyParams>({
   *   appId: 'myApp',
   *   getParamsSchema: getMyParamsSchema,
   *   loadComponent: () => import('./my_app').then((m) => m.MyApp),
   * });
   * ```
   */
  getParamsSchema?: () => z.ZodType<TParams>;
}

/** Sidebar setup contract */
export interface SidebarSetup {
  /** Register a sidebar app */
  registerApp<TParams = {}>(app: SidebarAppDefinition<TParams>): void;
}

/** App-bound API obtained via `sidebar.getApp(appId)` */
export interface SidebarApp<TParams = {}> {
  /** Open sidebar to this app with optional initial params */
  open: (params?: Partial<TParams>) => void;
  /** Close sidebar */
  close: () => void;
  /** Update params (merges with existing) */
  setParams: (params: Partial<TParams>) => void;
  /** Get current params */
  getParams: () => TParams;
  /** Observable of params */
  getParams$: () => Observable<TParams>;
  /** Set availability */
  setAvailable: (available: boolean) => void;
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
  getApp: <TParams = {}>(appId: SidebarAppId) => SidebarApp<TParams>;
  /** Get app definition */
  getAppDefinition: (appId: SidebarAppId) => SidebarAppDefinition;
}
