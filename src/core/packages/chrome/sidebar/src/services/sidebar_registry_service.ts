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
}

export interface SidebarRegistryServiceApi {
  apps$: Observable<SidebarApp[]>;
  getApps: () => SidebarApp[];
  registerApp<TParams = {}>(app: SidebarApp<TParams>): void;
  getApp(appId: string): SidebarApp;
  hasApp: (appId: string) => boolean;
}

export class SidebarRegistryService implements SidebarRegistryServiceApi {
  private readonly registeredApps = new Map<string, SidebarApp>();
  private readonly _apps$ = new BehaviorSubject<SidebarApp[]>([]);
  public apps$ = this._apps$.asObservable();

  constructor() {}

  registerApp<TParams = {}>(app: SidebarApp<TParams>): void {
    if (this.registeredApps.has(app.appId)) {
      throw new Error(`[Sidebar Registry] App already registered: ${app.appId}`);
    }
    this.registeredApps.set(app.appId, app as unknown as SidebarApp);
    this.updateAppsObservable();
  }

  getApps(): SidebarApp[] {
    return this._apps$.getValue();
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

  private updateAppsObservable(): void {
    this._apps$.next(Array.from(this.registeredApps.values()));
  }
}
