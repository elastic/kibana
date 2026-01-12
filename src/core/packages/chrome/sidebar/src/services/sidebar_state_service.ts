/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// eslint-disable-next-line max-classes-per-file
import type { Observable } from 'rxjs';
import { BehaviorSubject, map } from 'rxjs';
import type { SidebarRegistryServiceApi } from './sidebar_registry_service';
import type { SidebarAppStateService } from './sidebar_app_state_service';

export interface SidebarStateServiceApi {
  isOpen$: Observable<boolean>;
  isOpen: () => boolean;
  open: <TParams = {}>(appId: string, params?: Partial<TParams>) => void;
  close: () => void;

  width$: Observable<number>;
  getWidth: () => number;
  setWidth: (width: number) => void;

  currentAppId$: Observable<string | null>;
  getCurrentAppId: () => string | null;
}

const DEFAULT_WIDTH = 400;
const MIN_WIDTH = 200;

export class SidebarStateService implements SidebarStateServiceApi {
  private readonly _currentAppId$ = new BehaviorSubject<string | null>(null);
  private readonly _width$ = new BehaviorSubject<number>(DEFAULT_WIDTH);

  public readonly currentAppId$ = this._currentAppId$.asObservable();
  public readonly isOpen$ = this._currentAppId$.pipe(map((appId) => appId !== null));
  public readonly width$ = this._width$.asObservable();

  constructor(
    private readonly registry: SidebarRegistryServiceApi,
    private readonly appStateService: SidebarAppStateService
  ) {}

  start() {
    const currentAppId = StorageHelper.get<string>('currentAppId') ?? null;

    if (currentAppId && this.registry.hasApp(currentAppId)) {
      // On restore, don't pass params - let the app state service load from storage
      this.open(currentAppId);
    }

    const width = StorageHelper.get<number>('width');
    if (width) {
      this.setWidth(width);
    }
  }

  open<TParams = {}>(appId: string, params?: Partial<TParams>): void {
    if (!this.registry.hasApp(appId)) {
      throw new Error(`[Sidebar State] Cannot open sidebar. App not registered: ${appId}`);
    }

    // Initialize params if provided (merges with defaults from schema)
    if (params) {
      this.appStateService.initializeParams(appId, params);
    }

    this._currentAppId$.next(appId);
    StorageHelper.set('currentAppId', appId);
  }

  close(): void {
    this._currentAppId$.next(null);
    StorageHelper.set('currentAppId', null);
  }

  isOpen(): boolean {
    return this._currentAppId$.getValue() !== null;
  }

  setWidth(width: number): void {
    width = Math.max(MIN_WIDTH, width);

    this._width$.next(width);
    StorageHelper.set('width', width);
  }

  getWidth(): number {
    return this._width$.getValue();
  }

  getCurrentAppId(): string | null {
    return this._currentAppId$.getValue();
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
