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
  title?: string;
}

export interface SidebarComponentProps<TState> {
  state: TState;
}
export type SidebarComponentType<TState> = ComponentType<SidebarComponentProps<TState>>;

/**
 * Content configuration for a sidebar app panel
 */
export interface SidebarAppContent<TState = unknown> {
  /**
   * Title displayed at the top of the sidebar panel
   */
  title: string;
  /**
   * Asynchronously loads the main component for the sidebar app
   */
  loadComponent: () => Promise<SidebarComponentType<TState>>;
  /**
   * Function to get the initial state for the sidebar app, accessible via SidebarAppStateService or useSidebarAppState hook
   */
  getInitialState: () => TState;
}

/**
 * Complete app definition for sidebar registration
 */
export interface SidebarApp<TAppState = unknown> {
  /**
   * Unique identifier for the sidebar app
   */
  appId: string;
  /**
   * Button configuration for the sidebar app
   */
  button: SidebarAppButton;
  /**
   * Content configuration for the sidebar app panel
   */
  app: SidebarAppContent<TAppState>;
}

export interface SidebarRegistryServiceApi {
  apps$: Observable<SidebarApp[]>;
  getApps: () => SidebarApp[];
  registerApp<TAppState = {}>(app: SidebarApp<TAppState>): void;
  getApp(appId: string): SidebarApp | undefined;
  hasApp: (appId: string) => boolean;
}

export class SidebarRegistryService implements SidebarRegistryServiceApi {
  private readonly registeredApps = new Map<string, SidebarApp>();
  private readonly _apps$ = new BehaviorSubject<SidebarApp[]>([]);
  public apps$ = this._apps$.asObservable();

  constructor() {}

  registerApp<TAppState = {}>(app: SidebarApp<TAppState>): void {
    if (this.registeredApps.has(app.appId)) {
      throw new Error(`[Sidebar Registry] App already registered: ${app.appId}`);
    }
    this.registeredApps.set(app.appId, app as unknown as SidebarApp);
    this.updateAppsObservable();
  }

  getApps(): SidebarApp[] {
    return this._apps$.getValue();
  }

  getApp(appId: string): SidebarApp | undefined {
    return this.registeredApps.get(appId);
  }

  hasApp(appId: string): boolean {
    return this.registeredApps.has(appId);
  }

  private updateAppsObservable(): void {
    this._apps$.next(Array.from(this.registeredApps.values()));
  }
}
