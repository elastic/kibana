/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { BehaviorSubject, Subject } from 'rxjs';

import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';

import type { ManagedFlyoutApi, ManagedFlyoutEntry } from '@kbn/core-overlays-browser';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { FlyoutContainer } from './flyout_container';

interface ManagedFlyoutServiceStartDeps {
  /**
   * Services needed to render the React entry point for the flyout.
   */
  analytics: AnalyticsServiceStart;
  i18n: I18nStart;
  theme: ThemeServiceStart;
  userProfile: UserProfileService;
  /**
   * The DOM element where the flyout will be rendered.
   * This is typically a container element in the application where the flyout should appear.
   */
  targetDomElement: HTMLElement;
}

export interface FlyoutState {
  main: ManagedFlyoutEntry | null;
  child: ManagedFlyoutEntry | null;
}

interface HistoryEntry {
  main: ManagedFlyoutEntry;
  child: ManagedFlyoutEntry | null;
}

export class ManagedFlyoutService implements ManagedFlyoutApi {
  private flyout$ = new Subject<FlyoutState>();
  private isOpen$ = new BehaviorSubject<boolean>(false);
  private targetElement: HTMLElement | null = null;
  private isStarted = false;

  private _currentMainEntry: ManagedFlyoutEntry | null = null;
  private _mainHistoryStack: HistoryEntry[] = [];
  private _childFlyoutEntry: ManagedFlyoutEntry | null = null;

  constructor() {
    this.flyout$.subscribe((state) => {
      this.isOpen$.next(!!state.main || !!state.child);
    });
  }

  private _emitFlyoutState(): void {
    this.flyout$.next({
      main: this._currentMainEntry,
      child: this._childFlyoutEntry,
    });
  }

  public start({ targetDomElement, ...startDeps }: ManagedFlyoutServiceStartDeps): void {
    if (this.isStarted) {
      return;
    }

    this.targetElement = targetDomElement;

    // need to use KibanaRenderContextProvider to provide the context for the flyout
    // because the RenderService isn't initialized yet
    ReactDOM.render(
      <KibanaRenderContextProvider {...startDeps}>
        <FlyoutContainer />
      </KibanaRenderContextProvider>,
      this.targetElement
    );
    this.isStarted = true;
  }

  public openFlyout(entry: ManagedFlyoutEntry): void {
    this.initializeFlyout(entry);
  }

  public closeFlyout(): void {
    this.initializeFlyout(null);
  }

  public nextFlyout(entry: ManagedFlyoutEntry): void {
    this.navigateToFlyout(entry);
  }

  public openChildFlyout(entry: ManagedFlyoutEntry): void {
    if (!this._currentMainEntry) {
      return;
    }
    this._childFlyoutEntry = entry;
    this._emitFlyoutState();
  }

  public isFlyoutOpen(): boolean {
    return this.getIsFlyoutOpen();
  }

  public goBack(): void {
    if (this.canGoBack()) {
      const prevState = this._mainHistoryStack.pop()!;
      this._currentMainEntry = prevState.main;
      this._childFlyoutEntry = prevState.child;
      this._emitFlyoutState();
    } else {
      this.initializeFlyout(null);
    }
  }

  public canGoBack(): boolean {
    return this._mainHistoryStack.length > 0;
  }

  public closeChildFlyout(): void {
    if (this._childFlyoutEntry) {
      this._childFlyoutEntry = null;
      this._emitFlyoutState();
    }
  }

  public getFlyout$(): Subject<FlyoutState> {
    return this.flyout$;
  }

  public getIsFlyoutOpen(): boolean {
    return this.isOpen$.getValue();
  }

  public initializeFlyout(entry: ManagedFlyoutEntry | null): void {
    this._mainHistoryStack = [];
    this._childFlyoutEntry = null;
    this._currentMainEntry = entry;
    this._emitFlyoutState();
  }

  public navigateToFlyout(entry: ManagedFlyoutEntry): void {
    if (this._currentMainEntry) {
      this._mainHistoryStack.push({
        main: this._currentMainEntry,
        child: this._childFlyoutEntry,
      });
    }
    this._childFlyoutEntry = null;
    this._currentMainEntry = entry;
    this._emitFlyoutState();
  }

  /**
   * TODO: use this from somewhere
   */
  public stop(): void {
    if (this.targetElement && this.isStarted) {
      ReactDOM.unmountComponentAtNode(this.targetElement);
      this.isStarted = false;
      this.targetElement = null;
      this.flyout$.complete();
      this.isOpen$.complete();
      this._mainHistoryStack = [];
      this._currentMainEntry = null;
      this._childFlyoutEntry = null;
    }
  }
}

export const managedFlyoutService = new ManagedFlyoutService();
