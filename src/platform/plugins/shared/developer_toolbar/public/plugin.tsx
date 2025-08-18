/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense } from 'react';

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';

import { BehaviorSubject } from 'rxjs';
import type { DeveloperToolbarAction } from './toolbar';

export interface DeveloperToolbarStart {
  registerAction: (action: DeveloperToolbarAction) => () => void;
}

export class DeveloperToolbarPlugin implements Plugin<void, DeveloperToolbarStart> {
  private actions$ = new BehaviorSubject<DeveloperToolbarAction[]>([]);
  private initialFeatureFlags: Record<string, unknown> = {};

  constructor(private readonly context: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    this.initialFeatureFlags = core.featureFlags.getInitialFeatureFlags(true);
  }

  public start(core: CoreStart): DeveloperToolbarStart {
    const registerAction = (action: DeveloperToolbarAction) => {
      const currentActions = this.actions$.value;
      const existingIndex = currentActions.findIndex((a) => a.id === action.id);

      if (existingIndex >= 0) {
        const updatedActions = [...currentActions];
        updatedActions[existingIndex] = action;
        this.actions$.next(updatedActions);
      } else {
        this.actions$.next([...currentActions, action]);
      }

      return () => {
        const filteredActions = this.actions$.value.filter((a) => action.id !== a.id);
        this.actions$.next(filteredActions);
      };
    };

    const LazyToolbar = React.lazy(() => import('./toolbar'));

    core.chrome.setGlobalFooter(
      <Suspense>
        <LazyToolbar actions$={this.actions$} envInfo={this.context.env} />
      </Suspense>
    );

    import('./feature_flags_action').then(({ FeatureFlagsAction }) => {
      registerAction({
        id: 'developerToolbar.overrideFeatureFlags',
        priority: 5,
        tooltip: 'Override Feature Flags',
        children: <FeatureFlagsAction core={core} initialFeatureFlags={this.initialFeatureFlags} />,
      });
    });

    return {
      registerAction,
    };
  }
  public stop() {}
}
