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
import type { SidebarAppId } from '../sidebar_app_id';
import type { SidebarRegistryServiceApi } from './sidebar_registry_service';

const isDev = process.env.NODE_ENV !== 'production';
/**
 * API for managing sidebar app params
 */
export interface SidebarAppStateServiceApi {
  /** Get observable stream of app params */
  getParams$<T>(appId: SidebarAppId): Observable<T>;

  /** Get current app params synchronously */
  getParams<T>(appId: SidebarAppId): T;

  /** Update app params (merges with existing params) */
  setParams<T>(appId: SidebarAppId, params: Partial<T>): void;
}

/**
 * Service for managing params passed to sidebar app components
 *
 * Params are persisted to localStorage and restored on page reload.
 * Components receive params as React props and can manage their own internal state.
 */
export class SidebarAppStateService implements SidebarAppStateServiceApi {
  private readonly appParams = new Map<string, BehaviorSubject<any>>();

  constructor(private readonly registry: SidebarRegistryServiceApi) {}

  getParams$<T>(appId: SidebarAppId): Observable<T> {
    return this.getOrCreateParams<T>(appId);
  }

  getParams<T>(appId: SidebarAppId): T {
    return this.getOrCreateParams<T>(appId).getValue();
  }

  setParams<T>(appId: SidebarAppId, params: Partial<T>): void {
    const currentParams = this.getParams<T>(appId);
    const newParams = { ...currentParams, ...params };

    if (isDev) {
      this.validateParams(appId, newParams);
    }
    this.getOrCreateParams<T>(appId).next(newParams as T);
    this.saveToStorage(appId, newParams as T);
  }

  /**
   * Initialize params for an app, optionally with provided initial values
   * @internal Used by sidebar state service when opening an app
   */
  initializeParams<T>(appId: SidebarAppId, initialParams?: Partial<T>): void {
    const defaultParams = this.createDefaultParams<T>(appId);
    const mergedParams = initialParams ? { ...defaultParams, ...initialParams } : defaultParams;

    if (isDev) {
      this.validateParams(appId, mergedParams);
    }

    if (this.appParams.has(appId)) {
      this.appParams.get(appId)!.next(mergedParams);
    } else {
      this.appParams.set(appId, new BehaviorSubject<T>(mergedParams as T));
    }

    this.saveToStorage(appId, mergedParams as T);
  }

  private getOrCreateParams<T>(appId: SidebarAppId): BehaviorSubject<T> {
    if (!this.appParams.has(appId)) {
      const storedParams = this.loadFromStorage<T>(appId);
      const initialParams = storedParams ?? this.createDefaultParams<T>(appId);

      this.appParams.set(appId, new BehaviorSubject<T>(initialParams));
    }
    return this.appParams.get(appId)!;
  }

  /**
   * Creates default params from schema defaults
   */
  private createDefaultParams<T>(appId: SidebarAppId): T {
    return this.validateParams(appId, {});
  }

  /**
   * Validates params against app's schema
   */
  private validateParams<T>(appId: SidebarAppId, params: unknown): T {
    const schema = this.registry.getApp(appId).getParamsSchema();
    try {
      return schema.parse(params) as T;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`[Sidebar] Invalid params for app '${appId}': ${z.prettifyError(error)}`);
      }
      throw error;
    }
  }

  private getStorageKey(appId: SidebarAppId): string {
    return `core.chrome.sidebar.app:${appId}`;
  }

  /**
   * Loads params from localStorage and validates against schema.
   * Returns null if not found, corrupted, or validation fails.
   */
  private loadFromStorage<T>(appId: SidebarAppId): T | null {
    try {
      const key = this.getStorageKey(appId);
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      return this.validateParams(appId, parsed);
    } catch (error) {
      // Invalid data - drop it
      return null;
    }
  }

  /**
   * Saves params to localStorage.
   * Fails silently on errors (quota exceeded, unavailable, etc.)
   */
  private saveToStorage<T>(appId: SidebarAppId, params: T): void {
    try {
      const key = this.getStorageKey(appId);
      localStorage.setItem(key, JSON.stringify(params));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`[Sidebar] localStorage error for '${appId}':`, error);
    }
  }
}
