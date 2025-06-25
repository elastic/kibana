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
  main: { entry: ManagedFlyoutEntry<any>; props?: any } | null;
  child: { entry: ManagedFlyoutEntry<any>; props?: any } | null;
}

interface HistoryEntry {
  main: { entry: ManagedFlyoutEntry<any>; props?: any };
  child: { entry: ManagedFlyoutEntry<any>; props?: any } | null;
}

export class ManagedFlyoutService implements ManagedFlyoutApi {
  // State and Observables
  public flyout$ = new Subject<FlyoutState>();
  private isOpen$ = new BehaviorSubject<boolean>(false);
  private targetElement: HTMLElement | null = null;
  private isStarted = false;

  // Main flyout state
  private _currentMainEntry: ManagedFlyoutEntry<any> | null = null;
  private _currentMainProps: any | undefined = undefined;
  private _mainHistoryStack: HistoryEntry[] = [];

  // Child flyout state
  private _childFlyoutEntry: ManagedFlyoutEntry<any> | null = null;
  private _childFlyoutProps: any | undefined = undefined;

  constructor() {
    this.flyout$.subscribe((state) => {
      this.isOpen$.next(!!state.main || !!state.child);
    });
  }

  // Internal helpers
  private _emitFlyoutState(): void {
    this.flyout$.next({
      main: this._currentMainEntry
        ? { entry: this._currentMainEntry, props: this._currentMainProps }
        : null,
      child: this._childFlyoutEntry
        ? { entry: this._childFlyoutEntry, props: this._childFlyoutProps }
        : null,
    });
  }

  // Lifecycle methods
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

  public stop(): void {
    if (this.targetElement && this.isStarted) {
      ReactDOM.unmountComponentAtNode(this.targetElement);
      this.isStarted = false;
      this.targetElement = null;
      this.flyout$.complete();
      this.isOpen$.complete();
      this._mainHistoryStack = [];
      this._currentMainEntry = null;
      this._currentMainProps = undefined;
      this._childFlyoutEntry = null;
      this._childFlyoutProps = undefined;
    }
  }

  // Main flyout navigation methods
  public openFlyout<TProps = any, TChildProps = any>(
    entry: ManagedFlyoutEntry<TProps>,
    props?: TProps,
    childEntry?: ManagedFlyoutEntry<TChildProps>,
    childProps?: TChildProps
  ): void {
    this.initializeFlyout(entry, props);

    // If a child flyout is provided, open it after initializing the main flyout
    if (childEntry) {
      this._childFlyoutEntry = childEntry;
      this._childFlyoutProps = childProps;
      this._emitFlyoutState();
    }
  }

  public closeFlyout(): void {
    this.initializeFlyout(null);
  }

  public nextFlyout<TProps = any, TChildProps = any>(
    entry: ManagedFlyoutEntry<TProps>,
    props?: TProps,
    childEntry?: ManagedFlyoutEntry<TChildProps>,
    childProps?: TChildProps
  ): void {
    this.navigateToFlyout(entry, props);

    // If a child flyout is provided, open it after navigating to the main flyout
    if (childEntry) {
      this._childFlyoutEntry = childEntry;
      this._childFlyoutProps = childProps;
      this._emitFlyoutState();
    }
  }

  public goBack(): void {
    if (this.canGoBack()) {
      const prevState = this._mainHistoryStack.pop()!;
      this._currentMainEntry = prevState.main.entry;
      this._currentMainProps = prevState.main.props;
      this._childFlyoutEntry = prevState.child?.entry || null;
      this._childFlyoutProps = prevState.child?.props;
      this._emitFlyoutState();
    } else {
      this.initializeFlyout(null);
    }
  }

  public canGoBack(): boolean {
    return this._mainHistoryStack.length > 0;
  }

  // Child flyout methods
  public openChildFlyout<TProps = any>(entry: ManagedFlyoutEntry<TProps>, props?: TProps): void {
    if (!this._currentMainEntry) {
      return;
    }
    this._childFlyoutEntry = entry;
    this._childFlyoutProps = props;
    this._emitFlyoutState();
  }

  public closeChildFlyout(): void {
    if (this._childFlyoutEntry) {
      this._childFlyoutEntry = null;
      this._childFlyoutProps = undefined;
      this._emitFlyoutState();
    }
  }

  // State query methods
  public getFlyout$(): Subject<FlyoutState> {
    return this.flyout$;
  }

  public getIsFlyoutOpen(): boolean {
    return this.isOpen$.getValue();
  }

  public isFlyoutOpen(): boolean {
    return this.getIsFlyoutOpen();
  }

  // Implementation details for navigation
  public initializeFlyout<TProps = any>(
    entry: ManagedFlyoutEntry<TProps> | null,
    props?: TProps
  ): void {
    this._mainHistoryStack = [];
    this._childFlyoutEntry = null;
    this._childFlyoutProps = undefined;
    this._currentMainEntry = entry;
    this._currentMainProps = props;
    this._emitFlyoutState();
  }

  public navigateToFlyout<TProps = any>(entry: ManagedFlyoutEntry<TProps>, props?: TProps): void {
    if (this._currentMainEntry) {
      this._mainHistoryStack.push({
        main: {
          entry: this._currentMainEntry,
          props: this._currentMainProps,
        },
        child: this._childFlyoutEntry
          ? {
              entry: this._childFlyoutEntry,
              props: this._childFlyoutProps,
            }
          : null,
      });
    }
    this._childFlyoutEntry = null;
    this._childFlyoutProps = undefined;
    this._currentMainEntry = entry;
    this._currentMainProps = props;
    this._emitFlyoutState();
  }
}

export const managedFlyoutService = new ManagedFlyoutService();
