/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, Suspense } from 'react';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { DeveloperToolbarStart } from '@kbn/developer-toolbar-plugin/public';
import type { ConfigSchema } from '../server/config';

interface PluginStartDeps {
  developerToolbar?: DeveloperToolbarStart;
}

const LazyInspectButton = lazy(() =>
  import('./components/inspect/inspect_button').then(({ InspectButton }) => ({
    default: InspectButton,
  }))
);

export class InspectComponentPluginPublic implements Plugin<void, PluginStartDeps> {
  private readonly isDev: boolean;
  private readonly isEnabled: boolean;
  private readonly branch: string;

  constructor(initializerContext: PluginInitializerContext) {
    const { enabled } = initializerContext.config.get<ConfigSchema>();
    this.isEnabled = enabled;
    this.isDev = initializerContext.env.mode.dev;
    this.branch = initializerContext.env.packageInfo.branch;
  }

  public setup(_core: CoreSetup) {
    return {};
  }

  public start(core: CoreStart, plugins: PluginStartDeps) {
    if (!this.isEnabled || !this.isDev) return {};

    const inspectButton = (location: 'developerToolbar' | 'header') => (
      <Suspense fallback={null}>
        <LazyInspectButton core={core} branch={this.branch} buttonLocation={location} />
      </Suspense>
    );

    if (plugins.developerToolbar) {
      plugins.developerToolbar.registerItem({
        id: 'Inspect Component',
        children: inspectButton('developerToolbar'),
      });
    } else {
      core.chrome.navControls.registerRight({
        order: 1002,
        content: inspectButton('header'),
      });
    }

    return {};
  }

  public stop() {}
}
