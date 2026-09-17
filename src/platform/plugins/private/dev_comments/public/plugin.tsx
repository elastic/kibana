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
import type { ConfigSchema } from '../server/config';

interface PluginStartDeps {
  developerToolbar?: DeveloperToolbarStart;
}

// The layer mounts with the toolbar item rather than on first use: it records the
// clicks that reveal UI from the start, so that a comment made inside a flyout
// opened before comment mode was ever switched on can still lead readers there.
const LazyCommentsItem = lazy(() =>
  import('./comments_item').then(({ CommentsItem }) => ({ default: CommentsItem }))
);

export class DevCommentsPlugin implements Plugin<void, void, never, PluginStartDeps> {
  private readonly isDev: boolean;
  private readonly isEnabled: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    this.isDev = initializerContext.env.mode.dev;
    this.isEnabled = initializerContext.config.get<ConfigSchema>().enabled;
  }

  public setup(_core: CoreSetup) {}

  public start(core: CoreStart, { developerToolbar }: PluginStartDeps) {
    if (!this.isEnabled || !this.isDev || !developerToolbar) {
      return;
    }
    developerToolbar.registerItem({
      id: 'Comments',
      children: (
        <Suspense fallback={null}>
          <LazyCommentsItem core={core} />
        </Suspense>
      ),
    });
  }

  public stop() {}
}
