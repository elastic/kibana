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
import type { SidebarAppId } from '@kbn/core-chrome-sidebar';
import type { SidebarRegistryService } from './sidebar_registry_service';
import type { StorageHelper } from './storage_helper';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Service for managing params passed to sidebar app components.
 * Params are persisted to localStorage and restored on page reload.
 */
export class SidebarAppStateService {
  private readonly appParams = new Map<string, BehaviorSubject<any>>();

  constructor(
    private readonly registry: SidebarRegistryService,
    private readonly storage: StorageHelper
  ) {}

  getParams$<T>(appId: SidebarAppId): Observable<T> {
    return this.getOrCreateParams<T>(appId);
  }

  getParams<T>(appId: SidebarAppId): T {
    return this.getOrCreateParams<T>(appId).getValue();
  }

  setParams<T>(appId: SidebarAppId, params: Partial<T>): void {
    const currentParams = this.getParams<T>(appId);
    // validate set params in dev mode only to avoid performance overhead in prod and avoid crashing
    const newParams = isDev
      ? this.parseParams<T>(appId, { ...currentParams, ...params })
      : { ...currentParams, ...params };
    this.getOrCreateParams<T>(appId).next(newParams);
    this.storage.set(appId, newParams);
  }

  private getOrCreateParams<T>(appId: SidebarAppId): BehaviorSubject<T> {
    if (!this.appParams.has(appId)) {
      // Try storage first, fall back to schema defaults on any failure
      const stored = this.storage.get<unknown>(appId);
      const params = this.parseParams<T>(appId, stored ?? {});
      this.appParams.set(appId, new BehaviorSubject<T>(params));
    }
    return this.appParams.get(appId)!;
  }

  /**
   * Validates params against app's schema.
   * Falls back to schema defaults if validation fails.
   */
  private parseParams<T>(appId: SidebarAppId, params: unknown): T {
    const schema = this.registry.getApp(appId).getParamsSchema();
    const result = schema.safeParse(params);
    if (result.success) return result.data as T;

    // Invalid data - fall back to defaults
    if (isDev) {
      // eslint-disable-next-line no-console
      console.warn(`[Sidebar] Invalid params for app '${appId}', using defaults:`, result.error);
    }
    return schema.parse({}) as T;
  }
}
