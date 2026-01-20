/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import { map, startWith, Subject } from 'rxjs';
import { memoize } from 'decko';
import type { SidebarAppDefinition, SidebarAppId } from '@kbn/core-chrome-sidebar';
import { isValidSidebarAppId } from '@kbn/core-chrome-sidebar';

export class SidebarRegistryService {
  private readonly registeredApps = new Map<string, SidebarAppDefinition>();
  private readonly changed$ = new Subject<void>();

  @memoize
  private getApps$(): Observable<SidebarAppDefinition[]> {
    return this.changed$.pipe(
      startWith(undefined),
      map(() => Array.from(this.registeredApps.values()))
    );
  }

  @memoize
  private getAvailableApps$(): Observable<string[]> {
    return this.getApps$().pipe(
      map((apps) => apps.map((app) => app.appId).filter((appId) => this.isAvailable(appId)))
    );
  }

  registerApp<TParams = {}>(app: SidebarAppDefinition<TParams>): void {
    if (!isValidSidebarAppId(app.appId)) {
      throw new Error(
        `[Sidebar Registry] Invalid app ID: ${app.appId}. App ID must be either explicitly listed`
      );
    }

    if (this.registeredApps.has(app.appId)) {
      throw new Error(`[Sidebar Registry] App already registered: ${app.appId}`);
    }

    this.registeredApps.set(app.appId, {
      ...app,
      available: app.available !== false,
    } as SidebarAppDefinition);
    this.changed$.next();
  }

  getApp(appId: SidebarAppId): SidebarAppDefinition {
    const app = this.registeredApps.get(appId);
    if (!app) {
      throw new Error(`[Sidebar Registry] App not found: ${appId}`);
    }
    return app;
  }

  hasApp(appId: SidebarAppId): boolean {
    return this.registeredApps.has(appId);
  }

  setAvailable(appId: SidebarAppId, available: boolean): void {
    const app = this.registeredApps.get(appId);
    if (!app) {
      throw new Error(`[Sidebar Registry] Cannot set availability. App not registered: ${appId}`);
    }

    this.registeredApps.set(appId, { ...app, available });
    this.changed$.next();
  }

  @memoize
  getAvailable$(appId: SidebarAppId): Observable<boolean> {
    if (!this.registeredApps.has(appId)) {
      throw new Error(`[Sidebar Registry] Cannot get availability. App not registered: ${appId}`);
    }
    return this.getAvailableApps$().pipe(map((availableAppIds) => availableAppIds.includes(appId)));
  }

  isAvailable(appId: SidebarAppId): boolean {
    const app = this.registeredApps.get(appId);
    return app ? app.available !== false : false;
  }
}
