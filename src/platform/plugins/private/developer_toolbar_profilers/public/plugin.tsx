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
import type { DeveloperToolbarStart } from '@kbn/developer-toolbar-plugin/public';

interface PluginStartDeps {
  developerToolbar: DeveloperToolbarStart;
}

const LazyProfileControl = lazy(() =>
  import('./components/profile_control').then(({ ProfileControl }) => ({
    default: ProfileControl,
  }))
);

export class DeveloperToolbarProfilersPlugin implements Plugin<void, void, never, PluginStartDeps> {
  private readonly isDev: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    this.isDev = initializerContext.env.mode.dev;
  }

  public setup(_core: CoreSetup) {}

  public start({ http, notifications }: CoreStart, { developerToolbar }: PluginStartDeps) {
    if (!this.isDev) {
      return;
    }

    developerToolbar.registerItem({
      id: 'Server CPU Profile',
      children: (
        <Suspense fallback={null}>
          <LazyProfileControl type="cpu" http={http} toasts={notifications.toasts} />
        </Suspense>
      ),
    });

    developerToolbar.registerItem({
      id: 'Server Memory Profile',
      children: (
        <Suspense fallback={null}>
          <LazyProfileControl type="memory" http={http} toasts={notifications.toasts} />
        </Suspense>
      ),
    });
  }

  public stop() {}
}
