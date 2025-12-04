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
import type { ReactNode } from 'react';

/**
 * Button configuration for a sidebar app
 */
export interface SidebarAppButton {
  iconType: string;
  title?: string;
}

/**
 * Content configuration for a sidebar app panel
 */
export interface SidebarAppContent {
  title: string;
  children?: ReactNode;
  order?: number;
}

/**
 * Size options for sidebar
 */
export type SidebarSize = 'regular' | 'wide';

/**
 * Complete app definition for sidebar registration
 */
export interface SidebarApp {
  appId: string;
  button: SidebarAppButton;
  app: SidebarAppContent;
  size?: SidebarSize;
}

export interface SidebarRegistryServiceApi {
  apps$: Observable<SidebarApp[]>;
  getApps: () => SidebarApp[];
  registerApp: (app: SidebarApp) => void;
  hasApp: (appId: string) => boolean;
}

export class SidebarRegistryService implements SidebarRegistryServiceApi {
  private readonly registeredApps = new Map<string, SidebarApp>();
  private readonly _apps$ = new BehaviorSubject<SidebarApp[]>([]);
  public apps$ = this._apps$.asObservable();

  constructor() {}

  registerApp(app: SidebarApp): void {
    if (this.registeredApps.has(app.appId)) {
      throw new Error(`[Sidebar Registry] App already registered: ${app.appId}`);
    }
    this.registeredApps.set(app.appId, app);
    this.updateAppsObservable();
  }

  getApps(): SidebarApp[] {
    return this._apps$.getValue();
  }

  hasApp(appId: string): boolean {
    return this.registeredApps.has(appId);
  }

  private updateAppsObservable(): void {
    this._apps$.next(Array.from(this.registeredApps.values()));
  }
}
