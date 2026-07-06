/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import { map, startWith, Subject, distinctUntilChanged } from 'rxjs';
import type {
  SidebarAppConfig,
  SidebarAppDefinition,
  SidebarAppId,
  SidebarAppUpdate,
  SidebarAppUpdater,
  SidebarAppStatus,
} from '@kbn/core-chrome-sidebar';
import { isValidSidebarAppId } from '@kbn/core-chrome-sidebar';
import { bind, memoize } from './utils';

export class SidebarRegistryService {
  private readonly registeredApps = new Map<string, SidebarAppDefinition>();
  private readonly changed$ = new Subject<void>();

  @bind
  registerApp<TState = undefined, TActions = undefined>(
    app: SidebarAppConfig<TState, TActions>
  ): SidebarAppUpdater {
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
      status: app.status ?? 'available',
      restoreOnReload: app.restoreOnReload !== false,
    } as SidebarAppDefinition);
    this.changed$.next();

    return (update: SidebarAppUpdate) => {
      if (update.status !== undefined) {
        this.setStatus(app.appId, update.status);
      }
    };
  }

  @bind
  getApp(appId: SidebarAppId): SidebarAppDefinition {
    const app = this.registeredApps.get(appId);
    if (!app) {
      throw new Error(`[Sidebar Registry] App not found: ${appId}`);
    }
    return app;
  }

  @bind
  hasApp(appId: SidebarAppId): boolean {
    return this.registeredApps.has(appId);
  }

  private setStatus(appId: SidebarAppId, status: SidebarAppStatus): void {
    const app = this.registeredApps.get(appId);
    if (!app) {
      throw new Error(`[Sidebar Registry] Cannot set status. App not registered: ${appId}`);
    }

    this.registeredApps.set(appId, { ...app, status });
    this.changed$.next();
  }

  @memoize
  getStatus$(appId: SidebarAppId): Observable<SidebarAppStatus> {
    if (!this.registeredApps.has(appId)) {
      throw new Error(`[Sidebar Registry] Cannot get status. App not registered: ${appId}`);
    }

    return this.changed$.pipe(
      startWith(undefined),
      map(() => this.registeredApps.get(appId)!.status),
      distinctUntilChanged()
    );
  }

  isOpenable(appId: SidebarAppId): boolean {
    const app = this.registeredApps.get(appId);
    return app ? app.status !== 'unavailable' : false;
  }

  isRestorable(appId: SidebarAppId): boolean {
    const app = this.registeredApps.get(appId);
    return app ? app.restoreOnReload : false;
  }
}
