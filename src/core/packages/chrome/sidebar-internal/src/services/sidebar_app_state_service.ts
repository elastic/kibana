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
import type { SidebarAppId } from '@kbn/core-chrome-sidebar';
import type { SidebarRegistryService } from './sidebar_registry_service';
import type { StorageHelper } from './storage_helper';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Service for managing params passed to sidebar app components
 *
 * Params are persisted to localStorage and restored on page reload.
 * Components receive params as React props and can manage their own internal state.
 */
export class SidebarAppStateService {
  private readonly appParams = new Map<string, BehaviorSubject<any>>();

  constructor(
    private readonly registry: SidebarRegistryService,
    private readonly storage: StorageHelper
  ) {}

  start(): void {}

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
      this.parseParams(appId, newParams);
    }
    this.getOrCreateParams<T>(appId).next(newParams as T);
    this.storage.set(appId, newParams as T);
  }

  /**
   * Initialize params for an app, optionally with provided initial values
   * @internal Used by sidebar state service when opening an app
   */
  initializeParams<T>(appId: SidebarAppId, initialParams?: Partial<T>): void {
    const defaultParams = this.createDefaultParams<T>(appId);
    const mergedParams = initialParams ? { ...defaultParams, ...initialParams } : defaultParams;

    if (isDev) {
      this.parseParams(appId, mergedParams);
    }

    if (this.appParams.has(appId)) {
      this.appParams.get(appId)!.next(mergedParams);
    } else {
      this.appParams.set(appId, new BehaviorSubject<T>(mergedParams as T));
    }

    this.storage.set(appId, mergedParams as T);
  }

  private getOrCreateParams<T>(appId: SidebarAppId): BehaviorSubject<T> {
    if (!this.appParams.has(appId)) {
      const storedParams = this.loadAndValidateParams<T>(appId);
      const initialParams = storedParams ?? this.createDefaultParams<T>(appId);

      this.appParams.set(appId, new BehaviorSubject<T>(initialParams));
    }
    return this.appParams.get(appId)!;
  }

  /**
   * Creates default params from schema defaults
   */
  private createDefaultParams<T>(appId: SidebarAppId): T {
    return this.parseParams(appId, {});
  }

  /**
   * Validates params against app's schema
   */
  private parseParams<T>(appId: SidebarAppId, params: unknown): T {
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

  /**
   * Loads params from localStorage and validates against schema.
   * Returns null if not found, corrupted, or validation fails.
   */
  private loadAndValidateParams<T>(appId: SidebarAppId): T | null {
    try {
      const stored = this.storage.get<unknown>(appId);
      if (!stored) return null;
      return this.parseParams(appId, stored);
    } catch {
      // Invalid data - drop it
      return null;
    }
  }
}
