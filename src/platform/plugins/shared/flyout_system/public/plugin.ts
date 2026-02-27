/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';

const PLUGIN_NAME = 'Flyout System Examples';

export class FlyoutSystemExamplesPlugin implements Plugin<void, void> {
  public setup(core: CoreSetup): void {
    // Register application with the core application service (available in full builds)
    core.application.register({
      id: 'flyoutSystemExamples',
      title: PLUGIN_NAME,
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart] = await core.getStartServices();
        return renderApp(coreStart, params);
      },
    });
  }

  public start(_core: CoreStart) {
    return {};
  }

  public stop() {}
}
