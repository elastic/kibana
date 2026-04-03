/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import type { SidebarAppId, SidebarSide } from '@kbn/core-chrome-sidebar';
import { isValidSidebarAppId } from '@kbn/core-chrome-sidebar';
import type { SidebarRegistryService } from './sidebar_registry_service';
import type { StorageHelper } from './storage_helper';
import { bind, memoize } from './utils';

const MIN_WIDTH = 320;
const DEFAULT_WIDTH_PERCENT = 0.3;
const MAX_WIDTH_PERCENT = 0.5;

function getMaxWidth(): number {
  return Math.max(MIN_WIDTH, Math.floor(window.innerWidth * MAX_WIDTH_PERCENT));
}

function getDefaultWidth(): number {
  return Math.max(MIN_WIDTH, Math.floor(window.innerWidth * DEFAULT_WIDTH_PERCENT));
}

export class SidebarStateService {
  private readonly currentAppId$ = new BehaviorSubject<SidebarAppId | null>(null);
  private readonly width$ = new BehaviorSubject<number>(getDefaultWidth());
  private readonly fullWidth$ = new BehaviorSubject<boolean>(false);
  private readonly sidebarSide$ = new BehaviorSubject<SidebarSide>('right');

  constructor(
    private readonly registry: SidebarRegistryService,
    private readonly storage: StorageHelper
  ) {}

  @bind
  @memoize
  isOpen$(): Observable<boolean> {
    return this.currentAppId$.pipe(map((appId) => appId !== null));
  }

  @bind
  @memoize
  getWidth$(): Observable<number> {
    return combineLatest([this.fullWidth$, this.width$]).pipe(
      map(([isFull]) => (isFull ? window.innerWidth : this.width$.getValue()))
    );
  }

  @bind
  @memoize
  isFullWidth$(): Observable<boolean> {
    return this.fullWidth$.asObservable();
  }

  @bind
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
      this.registry.isRestorable(currentAppId) &&
      this.registry.isOpenable(currentAppId)
    ) {
      this.open(currentAppId);
    }

    const width = this.storage.get<number>('width');
    if (width) {
      this.setWidth(width);
    }

    const side = this.storage.get<string>('sidebarSide');
    if (side === 'left' || side === 'right') {
      this.sidebarSide$.next(side);
    }

    window.addEventListener('resize', this.handleWindowResize);
  }

  private handleWindowResize = () => {
    if (this.fullWidth$.getValue()) {
      // Re-emit so layout recomputes with the new window.innerWidth
      this.width$.next(this.width$.getValue());
    } else {
      this.setWidth(this.getWidth());
    }
  };

  @bind
  open(appId: SidebarAppId): void {
    if (!this.registry.hasApp(appId)) {
      throw new Error(`[Sidebar State] Cannot open sidebar. App not registered: ${appId}`);
    }

    if (!this.registry.isOpenable(appId)) {
      throw new Error(`[Sidebar State] Cannot open sidebar. App is unavailable: ${appId}`);
    }

    this.currentAppId$.next(appId);
    this.storage.set('currentAppId', appId, 'session');
  }

  @bind
  close(): void {
    this.currentAppId$.next(null);
    this.storage.set('currentAppId', null, 'session');
  }

  @bind
  isOpen(): boolean {
    return this.currentAppId$.getValue() !== null;
  }

  @bind
  setWidth(width: number): void {
    width = Math.floor(width);
    const maxWidth = getMaxWidth();
    width = Math.max(MIN_WIDTH, Math.min(maxWidth, width));

    if (this.width$.getValue() !== width) {
      this.width$.next(width);
      this.storage.set('width', width);
    }
  }

  @bind
  getWidth(): number {
    return this.fullWidth$.getValue() ? window.innerWidth : this.width$.getValue();
  }

  @bind
  setFullWidth(value: boolean): void {
    if (this.fullWidth$.getValue() !== value) {
      this.fullWidth$.next(value);
      // Trigger re-emission of width so subscribers recalculate
      this.width$.next(this.width$.getValue());
    }
  }

  @bind
  isFullWidth(): boolean {
    return this.fullWidth$.getValue();
  }

  @bind
  getCurrentAppId(): SidebarAppId | null {
    return this.currentAppId$.getValue();
  }

  @bind
  @memoize
  getSidebarSide$(): Observable<SidebarSide> {
    return this.sidebarSide$.asObservable();
  }

  @bind
  getSidebarSide(): SidebarSide {
    return this.sidebarSide$.getValue();
  }

  @bind
  setSidebarSide(side: SidebarSide): void {
    if (this.sidebarSide$.getValue() !== side) {
      this.sidebarSide$.next(side);
      this.storage.set('sidebarSide', side);
    }
  }

  stop() {
    window.removeEventListener('resize', this.handleWindowResize);
  }
}
