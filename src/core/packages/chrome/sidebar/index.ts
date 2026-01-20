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

/**
 * Valid sidebar app IDs (explicitly listed production apps)
 */
export const VALID_SIDEBAR_APP_IDS = [] as const;

/**
 * Prefix for example/test app IDs (any ID starting with this prefix is allowed)
 */
export const EXAMPLE_APP_ID_PREFIX = 'sidebarExample';

/**
 * Type for known sidebar app IDs
 * Includes explicitly listed IDs and any ID starting with 'sidebarExample'
 */
export type SidebarAppId = (typeof VALID_SIDEBAR_APP_IDS)[number] | `sidebarExample${string}`;

/**
 * Runtime validation function for sidebar app IDs
 */
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
 * Props passed to sidebar app components
 */
export interface SidebarComponentProps<TParams> {
  /** Current params for the sidebar app */
  params: TParams;
  /** Update params (merges with existing params, persists to localStorage) */
  setParams: (params: Partial<TParams>) => void;
  /** Close the sidebar panel */
  onClose: () => void;
}

export type SidebarComponentType<TParams> = ComponentType<SidebarComponentProps<TParams>>;

/**
 * Complete app definition for sidebar registration
 */
export interface SidebarAppDefinition<TParams = unknown> {
  /**
   * Unique identifier for the sidebar app
   */
  appId: SidebarAppId;
  /**
   * Whether the app is available. Defaults to true.
   * Unavailable apps will have their buttons hidden from the sidebar.
   * Use `setAvailable()` to update availability after registration (e.g., after permission checks).
   */
  available?: boolean;
  /**
   * Asynchronously loads the main component for the sidebar app
   */
  loadComponent: () => Promise<SidebarComponentType<TParams>>;
  /**
   * Function that returns a Zod schema defining the params structure and default values.
   *
   * Initial params are created by calling `getParamsSchema().parse({})`.
   * Use `.default()` on schema fields to provide initial values.
   *
   * Lazy evaluation ensures schemas are only built when needed.
   *
   * Params are persisted to localStorage and restored on page reload.
   *
   * @example
   * ```typescript
   * import { z } from '@kbn/zod/v4';
   *
   * const getMyParamsSchema = () => z.object({
   *   userName: z.string().default(''),
   *   count: z.number().int().nonnegative().default(0),
   * });
   *
   * type MyParams = z.infer<ReturnType<typeof getMyParamsSchema>>;
   *
   * registerApp({
   *   getParamsSchema: getMyParamsSchema,
   *   // ...
   * });
   * ```
   */
  getParamsSchema: () => z.ZodType<TParams>;
}

/**
 * Setup contract for the Sidebar service
 */
export interface SidebarSetup {
  /** Register a new sidebar app */
  registerApp<TParams = {}>(app: SidebarAppDefinition<TParams>): void;
}

/**
 * App-bound API for interacting with a specific sidebar app.
 * Obtained via `sidebar.getApp(appId)`.
 */
export interface SidebarApp<TParams = unknown> {
  /** Open the sidebar to this app, optionally with initial params */
  open: (params?: Partial<TParams>) => void;
  /** Close the sidebar (convenience method, equivalent to sidebar.close()) */
  close: () => void;
  /** Update params for this app (merges with existing params) */
  setParams: (params: Partial<TParams>) => void;
  /** Get current params synchronously */
  getParams: () => TParams;
  /** Get observable stream of params */
  getParams$: () => Observable<TParams>;
  /** Set the availability status of this app */
  setAvailable: (available: boolean) => void;
}

/**
 * Start contract for the Sidebar service
 */
export interface SidebarStart {
  /** Observable of whether the sidebar is open */
  isOpen$: () => Observable<boolean>;
  /** Get whether the sidebar is currently open */
  isOpen: () => boolean;
  /** Close the sidebar */
  close: () => void;
  /** Observable of the sidebar width */
  getWidth$: () => Observable<number>;
  /** Get the current sidebar width */
  getWidth: () => number;
  /** Set the sidebar width */
  setWidth: (width: number) => void;
  /** Observable of the currently open app ID */
  getCurrentAppId$: () => Observable<SidebarAppId | null>;
  /** Get the currently open app ID */
  getCurrentAppId: () => SidebarAppId | null;
  /** Observable of apps that are currently available */
  getAvailableApps$: () => Observable<string[]>;
  /** Check if an app is registered */
  hasApp: (appId: SidebarAppId) => boolean;
  /** Get the app-bound API for a specific sidebar app */
  getApp: <TParams = unknown>(appId: SidebarAppId) => SidebarApp<TParams>;
  /** Get the registration definition for a specific app */
  getAppDefinition: (appId: SidebarAppId) => SidebarAppDefinition;
}
