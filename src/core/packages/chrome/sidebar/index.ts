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
 * Content configuration for a sidebar app panel
 */
export interface SidebarAppContent<TParams = unknown> {
  /**
   * Title for the sidebar app, used for button tooltip and accessibility.
   * Apps can render their own header using the SidebarHeader component.
   */
  title: string;
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
 * Button configuration for a sidebar app
 */
export interface SidebarAppButton {
  /**
   * Type of icon to display on the sidebar button (e.g., 'search', 'settings', etc.)
   */
  iconType: string;
  /**
   * Optional title for the sidebar button (used for accessibility and tooltips), defaults to app title if not provided
   */
  buttonTitle?: string;
}

/**
 * Complete app definition for sidebar registration
 */
export interface SidebarApp<TParams = unknown>
  extends SidebarAppButton,
    SidebarAppContent<TParams> {
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
}

/**
 * Setup contract for the Sidebar service
 */
export interface SidebarSetup {
  /** Register a new sidebar app */
  registerApp<TParams = {}>(app: SidebarApp<TParams>): void;
}

/**
 * Start contract for the Sidebar service
 */
export interface SidebarStart {
  /** Observable of whether the sidebar is open */
  isOpen$: () => Observable<boolean>;
  /** Get whether the sidebar is currently open */
  isOpen: () => boolean;
  /** Open the sidebar to a specific app, optionally with initial params */
  open: <TParams = {}>(appId: SidebarAppId, params?: Partial<TParams>) => void;
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
  /** Get observable stream of app params */
  getParams$<T>(appId: SidebarAppId): Observable<T>;
  /** Get current app params synchronously */
  getParams<T>(appId: SidebarAppId): T;
  /** Update params for a sidebar app */
  setParams<T>(appId: SidebarAppId, params: Partial<T>): void;
  /** Set the availability status of a sidebar app */
  setAvailable: (appId: SidebarAppId, available: boolean) => void;
  /** Observable of apps that are currently available */
  getAvailableApps$: () => Observable<string[]>;
  /** Check if an app is registered */
  hasApp: (appId: SidebarAppId) => boolean;
  /** Get a specific app by ID */
  getApp: (appId: SidebarAppId) => SidebarApp;
}
