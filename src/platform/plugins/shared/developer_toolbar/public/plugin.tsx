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

import { BehaviorSubject } from 'rxjs';
import type { DeveloperToolbarItemProps } from '@kbn/developer-toolbar';

export type UnregisterItemFn = () => void;
export interface DeveloperToolbarItemRegistry {
  registerItem: (item: DeveloperToolbarItemProps) => UnregisterItemFn;
}

export type DeveloperToolbarSetup = DeveloperToolbarItemRegistry;
export type DeveloperToolbarStart = DeveloperToolbarItemRegistry;

const LazyMeasureButton = lazy(() =>
  import('@kbn/measure-component').then(({ MeasureButton }) => ({
    default: MeasureButton,
  }))
);

export class DeveloperToolbarPlugin
  implements Plugin<DeveloperToolbarSetup, DeveloperToolbarStart>
{
  private items$ = new BehaviorSubject<DeveloperToolbarItemProps[]>([]);

  constructor(private readonly context: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    return {
      registerItem: this.registerItem.bind(this),
    };
  }

  public start(core: CoreStart): DeveloperToolbarStart {
    const LazyToolbar = React.lazy(() => import('./toolbar'));
    (core.chrome as InternalChromeStart).setGlobalFooter(
      <Suspense>
        <LazyToolbar items$={this.items$} envInfo={this.context.env} />
      </Suspense>
    );

    this.registerItem({
      id: 'Measure Component',
      children: (
        <Suspense fallback={null}>
          <LazyMeasureButton />
        </Suspense>
      ),
    });

    return {
      registerItem: this.registerItem.bind(this),
    };
  }

  public stop() {}

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
