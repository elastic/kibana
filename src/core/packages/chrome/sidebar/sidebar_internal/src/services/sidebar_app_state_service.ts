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

/** Manages params for sidebar apps. Persists to localStorage. */
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
    const { getParamsSchema } = this.registry.getApp(appId);

    if (!getParamsSchema) {
      throw new Error(
        `[Sidebar] Cannot set params for app '${appId}': no params schema defined. ` +
          `Register the app with getParamsSchema to enable params.`
      );
    }

    const currentParams = this.getParams<T>(appId);
    const newParams = isDev
      ? this.parseParams<T>(appId, { ...currentParams, ...params })
      : { ...currentParams, ...params };
    this.getOrCreateParams<T>(appId).next(newParams);
    this.storage.set(appId, newParams);
  }

  private getOrCreateParams<T>(appId: SidebarAppId): BehaviorSubject<T> {
    if (!this.appParams.has(appId)) {
      const stored = this.storage.get<unknown>(appId);
      const params = this.parseParams<T>(appId, stored ?? {});
      this.appParams.set(appId, new BehaviorSubject<T>(params));
    }
    return this.appParams.get(appId)!;
  }

  /** Validates params against schema. Falls back to defaults on failure. */
  private parseParams<T>(appId: SidebarAppId, params: unknown): T {
    const { getParamsSchema } = this.registry.getApp(appId);

    if (!getParamsSchema) {
      return {} as T;
    }

    const schema = getParamsSchema();
    const result = schema.safeParse(params);
    if (result.success) return result.data as T;

    if (isDev) {
      // eslint-disable-next-line no-console
      console.warn(`[Sidebar] Invalid params for app '${appId}', using defaults:`, result.error);
    }
    return schema.parse({}) as T;
  }
}
