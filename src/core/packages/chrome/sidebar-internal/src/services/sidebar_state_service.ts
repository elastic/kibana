/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable, Subscription } from 'rxjs';
import { BehaviorSubject, filter, map, take } from 'rxjs';
import { memoize } from 'decko';
import type { SidebarAppId } from '@kbn/core-chrome-sidebar';
import { isValidSidebarAppId } from '@kbn/core-chrome-sidebar';
import type { SidebarRegistryService } from './sidebar_registry_service';
import type { SidebarAppStateService } from './sidebar_app_state_service';
import type { StorageHelper } from './storage_helper';

const DEFAULT_WIDTH = 400;
const MIN_WIDTH = 200;
const MAX_WIDTH_PERCENT = 0.5;

function getMaxWidth(): number {
  return Math.floor(window.innerWidth * MAX_WIDTH_PERCENT);
}

export class SidebarStateService {
  private readonly currentAppId$ = new BehaviorSubject<SidebarAppId | null>(null);
  private readonly width$ = new BehaviorSubject<number>(DEFAULT_WIDTH);
  private pendingRestoreSubscription?: Subscription;

  constructor(
    private readonly registry: SidebarRegistryService,
    private readonly appStateService: SidebarAppStateService,
    private readonly storage: StorageHelper
  ) {}

  @memoize
  isOpen$(): Observable<boolean> {
    return this.currentAppId$.pipe(map((appId) => appId !== null));
  }

  @memoize
  getWidth$(): Observable<number> {
    return this.width$.asObservable();
  }

  @memoize
  getCurrentAppId$(): Observable<SidebarAppId | null> {
    return this.currentAppId$.asObservable();
  }

  start() {
    const currentAppId = this.storage.get<string>('currentAppId', 'session') ?? null;

    if (
      currentAppId &&
      isValidSidebarAppId(currentAppId) &&
      this.registry.hasApp(currentAppId) &&
      this.registry.isRestorable(currentAppId)
    ) {
      if (this.registry.isAvailable(currentAppId)) {
        this.open(currentAppId);
      } else {
        this.waitForAvailabilityAndRestore(currentAppId);
      }
    }

    const width = this.storage.get<number>('width');
    if (width) {
      this.setWidth(width);
    }

    window.addEventListener('resize', this.handleWindowResize);
  }

  private handleWindowResize = () => {
    this.setWidth(this.getWidth());
  };

  /** Wait for app to become available, then restore it */
  private waitForAvailabilityAndRestore(appId: SidebarAppId): void {
    this.pendingRestoreSubscription?.unsubscribe();

    this.pendingRestoreSubscription = this.registry
      .getAvailable$(appId)
      .pipe(
        filter((available) => available),
        take(1)
      )
      .subscribe(() => {
        if (this.currentAppId$.getValue() === null) {
          this.open(appId);
        }
      });
  }

  open<TParams = {}>(appId: SidebarAppId, params?: Partial<TParams>): void {
    if (!this.registry.hasApp(appId)) {
      throw new Error(`[Sidebar State] Cannot open sidebar. App not registered: ${appId}`);
    }

    if (!this.registry.isAvailable(appId)) {
      throw new Error(`[Sidebar State] Cannot open sidebar. App not available: ${appId}`);
    }

    this.pendingRestoreSubscription?.unsubscribe();
    this.pendingRestoreSubscription = undefined;

    if (params) {
      this.appStateService.setParams(appId, params);
    }

    this.currentAppId$.next(appId);
    this.storage.set('currentAppId', appId, 'session');
  }

  close(): void {
    this.currentAppId$.next(null);
    this.storage.set('currentAppId', null, 'session');
  }

  isOpen(): boolean {
    return this.currentAppId$.getValue() !== null;
  }

  setWidth(width: number): void {
    const maxWidth = getMaxWidth();
    width = Math.max(MIN_WIDTH, Math.min(maxWidth, width));

    this.width$.next(width);
    this.storage.set('width', width);
  }

  getWidth(): number {
    return this.width$.getValue();
  }

  getCurrentAppId(): SidebarAppId | null {
    return this.currentAppId$.getValue();
  }
}
