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
 * State is stored in-memory and isolated per app ID.
 */
export class SidebarAppStateService implements SidebarAppStateServiceApi {
  private readonly appStates = new Map<string, BehaviorSubject<any>>();

  constructor(private readonly registry: SidebarRegistryServiceApi) {}

  /**
   * Creates initial state from schema defaults with validation and error handling
   */
  private createInitialState<T>(appId: string): T {
    const app = this.registry.getApp(appId);
    if (!app) {
      throw new Error(`[Sidebar] App not found: ${appId}`);
    }

    try {
      const schema = app.getStateSchema();
      return schema.parse({}) as T;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`[Sidebar] Invalid schema for app '${appId}': ${z.treeifyError(error)}`);
      }
      throw error;
    }
  }

  private getOrCreateState<T>(appId: string): BehaviorSubject<T> {
    if (!this.appStates.has(appId)) {
      const initialState = this.createInitialState<T>(appId);
      this.appStates.set(appId, new BehaviorSubject<T>(initialState));
    }
    return this.appStates.get(appId)!;
  }

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
    this.getOrCreateState<T>(appId).next(newState as T);
  }

  reset(appId: string): void {
    const initialState = this.createInitialState(appId);
    this.set(appId, initialState, false);
  }
}
