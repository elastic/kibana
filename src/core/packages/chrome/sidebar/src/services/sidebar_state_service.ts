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
import type { SidebarRegistryServiceApi } from './sidebar_registry_service';

export interface SidebarStateServiceApi {
  isOpen$: Observable<boolean>;
  isOpen: () => boolean;
  open: (appId: string) => void;
  close: () => void;

  width$: Observable<number>;
  getWidth: () => number;
  setWidth: (width: number) => void;

  currentAppId$: Observable<string | null>;
  getCurrentAppId: () => string | null;
}

const DEFAULT_WIDTH = 400;

export class SidebarStateService implements SidebarStateServiceApi {
  private readonly _isOpen$ = new BehaviorSubject<boolean>(false);
  private readonly _currentAppId$ = new BehaviorSubject<string | null>(null);
  private readonly _width$ = new BehaviorSubject<number>(DEFAULT_WIDTH);

  public readonly isOpen$ = this._isOpen$.asObservable();
  public readonly currentAppId$ = this._currentAppId$.asObservable();
  public readonly width$ = this._width$.asObservable();

  constructor(private readonly registry: SidebarRegistryServiceApi) {}

  open(appId: string): void {
    if (!this.registry.hasApp(appId)) {
      throw new Error(`[Sidebar State] Cannot open sidebar. App not registered: ${appId}`);
    }
    this._currentAppId$.next(appId);
    this._isOpen$.next(true);
  }

  close(): void {
    this._isOpen$.next(false);
    this._currentAppId$.next(null);
  }

  isOpen(): boolean {
    return this._isOpen$.getValue();
  }

  setWidth(width: number): void {
    // TODO: add width constraints
    this._width$.next(width);
  }

  getWidth(): number {
    return this._width$.getValue();
  }

  getCurrentAppId(): string | null {
    return this._currentAppId$.getValue();
  }
}
