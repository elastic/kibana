/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, lazy } from 'react';

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { InternalChromeStart } from '@kbn/core-chrome-browser-internal-types';
import type { InternalThemeServiceStart } from '@kbn/core-theme-browser-internal-types';

import { BehaviorSubject } from 'rxjs';
import {
  type DeveloperToolbarItemProps,
  isDeveloperToolbarItemEnabled,
  subscribeToDeveloperToolbarState,
} from '@kbn/developer-toolbar';

declare global {
  var featureFlagsHelperInToolbar: boolean | undefined;
}

const FEATURE_FLAGS_HELPER_ITEM_ID = 'Feature flags helper';
/** Tells an already mounted helper that the toolbar setting changed. */
const FEATURE_FLAGS_HELPER_TOOLBAR_CHANGE = 'feature-flags-helper-toolbar-change';

function publishFeatureFlagsHelperInToolbar(inToolbar: boolean) {
  globalThis.featureFlagsHelperInToolbar = inToolbar;
  window.dispatchEvent(new Event(FEATURE_FLAGS_HELPER_TOOLBAR_CHANGE));
}

export type UnregisterItemFn = () => void;
export interface DeveloperToolbarItemRegistry {
  registerItem: (item: DeveloperToolbarItemProps) => UnregisterItemFn;
}

export type DeveloperToolbarSetup = DeveloperToolbarItemRegistry;
export type DeveloperToolbarStart = DeveloperToolbarItemRegistry;

const LazyColorThemeToggle = lazy(() =>
  import('@kbn/developer-toolbar').then(({ LiveColorThemeToggle }) => ({
    default: LiveColorThemeToggle,
  }))
);

const LazyMeasureButton = lazy(() =>
  import('@kbn/design-tools').then(({ MeasureButton }) => ({
    default: MeasureButton,
  }))
);

const LazyFontInspectButton = lazy(() =>
  import('@kbn/design-tools').then(({ FontInspectButton }) => ({
    default: FontInspectButton,
  }))
);

const LazyDesignToolsButton = lazy(() =>
  import('@kbn/design-tools').then(({ DesignToolsButton }) => ({
    default: DesignToolsButton,
  }))
);

const LazyFeatureFlagsHelperBadge = lazy(() =>
  import('./feature_flags_helper_badge').then(({ FeatureFlagsHelperBadge }) => ({
    default: FeatureFlagsHelperBadge,
  }))
);

export class DeveloperToolbarPlugin
  implements Plugin<DeveloperToolbarSetup, DeveloperToolbarStart>
{
  private items$ = new BehaviorSubject<DeveloperToolbarItemProps[]>([]);
  private unsubscribeToolbarState?: () => void;

  constructor(private readonly context: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    return {
      registerItem: this.registerItem.bind(this),
    };
  }

  public start(core: CoreStart): DeveloperToolbarStart {
    const syncFeatureFlagsHelperButton = () => {
      publishFeatureFlagsHelperInToolbar(
        isDeveloperToolbarItemEnabled(FEATURE_FLAGS_HELPER_ITEM_ID)
      );
    };
    syncFeatureFlagsHelperButton();
    this.unsubscribeToolbarState = subscribeToDeveloperToolbarState(syncFeatureFlagsHelperButton);

    const LazyToolbar = React.lazy(() => import('./toolbar'));
    (core.chrome as InternalChromeStart).setGlobalFooter(
      <Suspense>
        <LazyToolbar items$={this.items$} envInfo={this.context.env} />
      </Suspense>
    );

    this.registerItem({
      id: 'Color Theme',
      children: (
        <Suspense fallback={null}>
          <LazyColorThemeToggle theme={core.theme as InternalThemeServiceStart} />
        </Suspense>
      ),
    });

    this.registerItem({
      id: FEATURE_FLAGS_HELPER_ITEM_ID,
      children: (
        <Suspense fallback={null}>
          <LazyFeatureFlagsHelperBadge />
        </Suspense>
      ),
    });

    this.registerItem({
      id: 'Measure Component',
      children: (
        <Suspense fallback={null}>
          <LazyMeasureButton />
        </Suspense>
      ),
    });

    this.registerItem({
      id: 'Inspect Font',
      children: (
        <Suspense fallback={null}>
          <LazyFontInspectButton />
        </Suspense>
      ),
    });

    this.registerItem({
      id: 'Design Tools',
      children: (
        <Suspense fallback={null}>
          <LazyDesignToolsButton />
        </Suspense>
      ),
    });

    return {
      registerItem: this.registerItem.bind(this),
    };
  }

  public stop() {
    this.unsubscribeToolbarState?.();
    this.unsubscribeToolbarState = undefined;
    publishFeatureFlagsHelperInToolbar(false);
  }

  private registerItem = (item: DeveloperToolbarItemProps) => {
    const currentItems = this.items$.value;
    const existingIndex = currentItems.findIndex((a) => a.id === item.id);

    if (existingIndex >= 0) {
      const updatedItems = [...currentItems];
      updatedItems[existingIndex] = item;
      this.items$.next(updatedItems);
    } else {
      this.items$.next([...currentItems, item]);
    }

    return () => {
      const filteredItems = this.items$.value.filter((a) => item.id !== a.id);
      this.items$.next(filteredItems);
    };
  };
}
