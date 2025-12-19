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
import { z } from '@kbn/zod/v4';
import type { SidebarRegistryServiceApi } from './sidebar_registry_service';

const isDev = process.env.NODE_ENV !== 'production';

export interface SidebarAppStateServiceApi {
  /** Get observable stream of app state */
  get$<T>(appId: string): Observable<T>;

  /** Get current app state synchronously */
  get<T>(appId: string): T;

  /** Set complete app state (no merge) */
  set<T>(appId: string, state: T, merge: false): void;

  /** Merge partial state with existing state (default) */
  set<T>(appId: string, state: Partial<T>, merge?: true): void;

  /** Reset app state back to the initial state */
  reset(appId: string): void;
}

/**
 * Service for managing app-specific state in the sidebar
 *
 * Each sidebar app can store its own state independently using a generic interface.
 * State is stored in-memory and persisted to localStorage, isolated per app ID.
 */
export class SidebarAppStateService implements SidebarAppStateServiceApi {
  private readonly appStates = new Map<string, BehaviorSubject<any>>();

  constructor(private readonly registry: SidebarRegistryServiceApi) {}

  get$<T>(appId: string): Observable<T> {
    return this.getOrCreateState<T>(appId);
  }

  get<T>(appId: string): T {
    return this.getOrCreateState<T>(appId).getValue();
  }

  set<T>(appId: string, state: T, merge: false): void;
  set<T>(appId: string, state: Partial<T>, merge?: true): void;
  set<T>(appId: string, state: T | Partial<T>, merge: boolean = true): void {
    const newState = merge ? { ...this.get<T>(appId), ...state } : state;

    if (isDev) {
      this.validateState(appId, newState as T);
    }

    this.getOrCreateState<T>(appId).next(newState as T);

    this.saveToStorage(appId, newState as T);
  }

  reset(appId: string): void {
    const initialState = this.createInitialState(appId);
    this.set(appId, initialState, false);
  }

  private getOrCreateState<T>(appId: string): BehaviorSubject<T> {
    if (!this.appStates.has(appId)) {
      const storedState = this.loadFromStorage<T>(appId);
      const initialState = storedState ?? this.createInitialState<T>(appId);

      this.appStates.set(appId, new BehaviorSubject<T>(initialState));
    }
    return this.appStates.get(appId)!;
  }

  /**
   * Creates initial state from schema defaults with validation and error handling
   */
  private createInitialState<T>(appId: string): T {
    return this.validateState(appId, {});
  }

  /**
   * Validates state against app's schema
   */
  private validateState<T>(appId: string, state: unknown): T {
    const schema = this.registry.getApp(appId).getStateSchema();
    try {
      return schema.parse(state) as T;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`[Sidebar] Invalid state for app '${appId}': ${z.prettifyError(error)}`);
      }
      throw error;
    }
  }

  private getStorageKey(appId: string): string {
    return `core.chrome.sidebar.app:${appId}`;
  }

  /**
   * Loads state from localStorage and validates against schema.
   * Returns null if not found, corrupted, or validation fails.
   */
  private loadFromStorage<T>(appId: string): T | null {
    try {
      const key = this.getStorageKey(appId);
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      // Validate against schema
      return this.validateState(appId, parsed);
    } catch (error) {
      // Invalid data - drop it
      return null;
    }
  }

  /**
   * Saves state to localStorage.
   * Fails silently on errors (quota exceeded, unavailable, etc.)
   */
  private saveToStorage<T>(appId: string, state: T): void {
    try {
      const key = this.getStorageKey(appId);
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`[Sidebar] localStorage error for '${appId}':`, error);
    }
  }
}
