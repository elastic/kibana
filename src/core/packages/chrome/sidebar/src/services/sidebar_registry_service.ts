/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import { Subject, map, startWith } from 'rxjs';
import { memoize } from 'decko';
import type { ComponentType } from 'react';
import type { z } from '@kbn/zod/v4';

/**
 * Props passed to sidebar app components
 */
export interface SidebarComponentProps<TParams> {
  /** Current params for the sidebar app */
  params: TParams;
  /** Update params (merges with existing params, persists to localStorage) */
  setParams: (params: Partial<TParams>) => void;
}

export type SidebarComponentType<TParams> = ComponentType<SidebarComponentProps<TParams>>;

/**
 * Content configuration for a sidebar app panel
 */
export interface SidebarAppContent<TParams = unknown> {
  /**
   * Title displayed at the top of the sidebar panel
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
  appId: string;
  /**
   * Whether the app is available. Defaults to true.
   * Unavailable apps will have their buttons hidden from the sidebar.
   * Use `setAvailable()` to update availability after registration (e.g., after permission checks).
   */
  available?: boolean;
}

export interface SidebarRegistryServiceApi {
  /** Observable of all registered apps */
  getApps$: () => Observable<SidebarApp[]>;
  /** Get all registered apps */
  getApps: () => SidebarApp[];
  /** Register a new sidebar app */
  registerApp<TParams = {}>(app: SidebarApp<TParams>): void;
  /** Get a specific app by ID */
  getApp(appId: string): SidebarApp;
  /** Check if an app is registered */
  hasApp: (appId: string) => boolean;
  /** Set the availability status of an app */
  setAvailable: (appId: string, available: boolean) => void;
  /** Get reactive availability status for an app */
  getAvailable$: (appId: string) => Observable<boolean>;
  /** Get current availability status for an app */
  isAvailable: (appId: string) => boolean;
  /** Observable of apps ids that are currently available */
  getAvailableApps$: () => Observable<string[]>;
}

export class SidebarRegistryService implements SidebarRegistryServiceApi {
  private readonly registeredApps = new Map<string, SidebarApp>();
  private readonly changed$ = new Subject<void>();

  @memoize
  getApps$(): Observable<SidebarApp[]> {
    return this.changed$.pipe(
      startWith(undefined),
      map(() => Array.from(this.registeredApps.values()))
    );
  }

  @memoize
  getAvailableApps$(): Observable<string[]> {
    return this.getApps$().pipe(
      map((apps) => apps.map((app) => app.appId).filter((appId) => this.isAvailable(appId)))
    );
  }

  registerApp<TParams = {}>(app: SidebarApp<TParams>): void {
    if (this.registeredApps.has(app.appId)) {
      throw new Error(`[Sidebar Registry] App already registered: ${app.appId}`);
    }

    this.registeredApps.set(app.appId, {
      ...app,
      available: app.available !== false,
    } as SidebarApp);
    this.changed$.next();
  }

  getApps(): SidebarApp[] {
    return Array.from(this.registeredApps.values());
  }

  getApp(appId: string): SidebarApp {
    const app = this.registeredApps.get(appId);
    if (!app) {
      throw new Error(`[Sidebar Registry] App not found: ${appId}`);
    }
    return app;
  }

  hasApp(appId: string): boolean {
    return this.registeredApps.has(appId);
  }

  setAvailable(appId: string, available: boolean): void {
    const app = this.registeredApps.get(appId);
    if (!app) {
      throw new Error(`[Sidebar Registry] Cannot set availability. App not registered: ${appId}`);
    }

    this.registeredApps.set(appId, { ...app, available });
    this.changed$.next();
  }

  @memoize
  getAvailable$(appId: string): Observable<boolean> {
    if (!this.registeredApps.has(appId)) {
      throw new Error(`[Sidebar Registry] Cannot get availability. App not registered: ${appId}`);
    }
    return this.getAvailableApps$().pipe(map((availableAppIds) => availableAppIds.includes(appId)));
  }

  isAvailable(appId: string): boolean {
    const app = this.registeredApps.get(appId);
    return app ? app.available !== false : false;
  }
}
