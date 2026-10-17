/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { CoreSetup, Plugin } from '@kbn/core/public';
import { PLUGIN_ID } from '../common';

export class PluginInitializeExamplePlugin implements Plugin<void, void> {
  public setup(core: CoreSetup): void {
    // Registered like any app. Because the manifest sets `hasInitialization`, core shows its own
    // loading screen in this app's place until the server plugin's initialize() has succeeded.
    core.application.register({
      id: PLUGIN_ID,
      title: i18n.translate('pluginInitializeExample.app.title', {
        defaultMessage: 'Plugin initialize() example',
      }),
      async mount(params) {
        const [coreStart] = await core.getStartServices();
        const { renderApp } = await import('./app');
        return renderApp(coreStart, params);
      },
    });
  }

  public start(): void {}

  public stop(): void {}
}
