/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// eslint-disable-next-line max-classes-per-file
import type { Observable, Subscription } from 'rxjs';
import { BehaviorSubject, filter, map, take } from 'rxjs';
import { memoize } from 'decko';
import type { SidebarAppId } from '../sidebar_app_id';
import { isValidSidebarAppId } from '../sidebar_app_id';
import type { SidebarRegistryServiceApi } from './sidebar_registry_service';
import type { SidebarAppStateService } from './sidebar_app_state_service';

export interface SidebarStateServiceApi {
  isOpen$: () => Observable<boolean>;
  isOpen: () => boolean;
  open: <TParams = {}>(appId: SidebarAppId, params?: Partial<TParams>) => void;
  close: () => void;

  getWidth$: () => Observable<number>;
  getWidth: () => number;
  setWidth: (width: number) => void;

  getCurrentAppId$: () => Observable<SidebarAppId | null>;
  getCurrentAppId: () => SidebarAppId | null;
}

const DEFAULT_WIDTH = 400;
const MIN_WIDTH = 200;
const MAX_WIDTH_PERCENT = 0.5;

function getMaxWidth(): number {
  return Math.floor(window.innerWidth * MAX_WIDTH_PERCENT);
}

export class SidebarStateService implements SidebarStateServiceApi {
  private readonly currentAppId$ = new BehaviorSubject<SidebarAppId | null>(null);
  private readonly width$ = new BehaviorSubject<number>(DEFAULT_WIDTH);
  private pendingRestoreSubscription?: Subscription;

  constructor(
    private readonly registry: SidebarRegistryServiceApi,
    private readonly appStateService: SidebarAppStateService
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
    const currentAppId = StorageHelper.get<string>('currentAppId') ?? null;

    // Validate app ID from localStorage - ignore if invalid
    if (currentAppId && isValidSidebarAppId(currentAppId) && this.registry.hasApp(currentAppId)) {
      if (this.registry.isAvailable(currentAppId)) {
        // App exists and is available - restore immediately
        this.open(currentAppId);
      } else {
        // App exists but not available yet - wait for it to become available
        this.waitForAvailabilityAndRestore(currentAppId);
      }
    }

    const width = StorageHelper.get<number>('width');
    if (width) {
      this.setWidth(width);
    }

    // Re-validate width when window is resized to enforce max width constraint
    window.addEventListener('resize', this.handleWindowResize);
  }

  private handleWindowResize = () => {
    // Re-apply current width to enforce new max constraint based on viewport size
    this.setWidth(this.getWidth());
  };

  /**
   * Subscribe to availability changes and restore the app when it becomes available.
   * Only restores once, then cleans up the subscription.
   */
  private waitForAvailabilityAndRestore(appId: SidebarAppId): void {
    // Clean up any existing pending restore
    this.pendingRestoreSubscription?.unsubscribe();

    this.pendingRestoreSubscription = this.registry
      .getAvailable$(appId)
      .pipe(
        filter((available) => available), // Wait until available
        take(1) // Only restore once
      )
      .subscribe(() => {
        // Only restore if no other app has been opened in the meantime
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

    // Cancel any pending restore since user is explicitly opening an app
    this.pendingRestoreSubscription?.unsubscribe();
    this.pendingRestoreSubscription = undefined;

    // Initialize params if provided (merges with defaults from schema)
    if (params) {
      this.appStateService.initializeParams(appId, params);
    }

    this.currentAppId$.next(appId);
    StorageHelper.set('currentAppId', appId);
  }

  close(): void {
    this.currentAppId$.next(null);
    StorageHelper.set('currentAppId', null);
  }

  isOpen(): boolean {
    return this.currentAppId$.getValue() !== null;
  }

  setWidth(width: number): void {
    const maxWidth = getMaxWidth();
    width = Math.max(MIN_WIDTH, Math.min(maxWidth, width));

    this.width$.next(width);
    StorageHelper.set('width', width);
  }

  getWidth(): number {
    return this.width$.getValue();
  }

  getCurrentAppId(): SidebarAppId | null {
    return this.currentAppId$.getValue();
  }
}

type StorageKeys = 'currentAppId' | 'width';

class StorageHelper {
  static PERSISTENCE: Record<StorageKeys, 'local' | 'session'> = {
    currentAppId: 'session' as const,
    width: 'local' as const,
  };

  static getStoragePrefix(key: string): string {
    return `core.chrome.sidebar.state:${key}`;
  }

  static set<T>(key: StorageKeys, state: T): void {
    try {
      const storage = StorageHelper.PERSISTENCE[key] === 'local' ? localStorage : sessionStorage;
      storage.setItem(StorageHelper.getStoragePrefix(key), JSON.stringify(state));
    } catch (e) {
      // Ignore
    }
  }

  static get<T>(key: StorageKeys): T | null {
    try {
      const storage = StorageHelper.PERSISTENCE[key] === 'local' ? localStorage : sessionStorage;
      const item = storage.getItem(StorageHelper.getStoragePrefix(key));
      if (item) {
        return JSON.parse(item) as T;
      }
    } catch (e) {
      // Ignore
    }
    return null;
  }
}
