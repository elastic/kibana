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

export interface SidebarAppStateServiceApi {
  /** Get observable stream of app state */
  getAppState$<T>(appId: string): Observable<T | undefined>;

  /** Get current app state synchronously */
  getAppState<T>(appId: string): T | undefined;

  /** Set complete app state (replaces existing) */
  setAppState<T>(appId: string, state: T): void;

  /** Update app state partially (shallow merge) */
  updateAppState<T extends Record<string, any>>(appId: string, partial: Partial<T>): void;

  /** Clear app state */
  clearAppState(appId: string): void;
}

/**
 * Service for managing app-specific state in the sidebar
 *
 * Each sidebar app can store its own state independently using a generic interface.
 * State is stored in-memory and isolated per app ID.
 */
export class SidebarAppStateService implements SidebarAppStateServiceApi {
  private readonly appStates = new Map<string, BehaviorSubject<any>>();

  constructor() {}

  private getOrCreateSubject<T>(appId: string, defaultValue?: T): BehaviorSubject<T | undefined> {
    if (!this.appStates.has(appId)) {
      this.appStates.set(appId, new BehaviorSubject<T | undefined>(defaultValue));
    }
    return this.appStates.get(appId)!;
  }

  getAppState$<T>(appId: string): Observable<T | undefined> {
    return this.getOrCreateSubject<T>(appId).asObservable();
  }

  getAppState<T>(appId: string): T | undefined {
    return this.appStates.get(appId)?.getValue();
  }

  setAppState<T>(appId: string, state: T): void {
    this.getOrCreateSubject<T>(appId).next(state);
  }

  updateAppState<T extends Record<string, any>>(appId: string, partial: Partial<T>): void {
    const current = this.getAppState<T>(appId) || ({} as T);
    this.setAppState(appId, { ...current, ...partial });
  }

  clearAppState(appId: string): void {
    this.appStates.get(appId)?.next(undefined);
  }
}
