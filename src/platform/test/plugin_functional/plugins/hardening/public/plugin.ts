/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AppMountParameters, CoreSetup, Plugin } from '@kbn/core/public';

export class HardeningPlugin implements Plugin<HardeningPluginSetup, HardeningPluginStart> {
  public setup(core: CoreSetup) {
    core.application.register({
      id: 'hardeningPlugin',
      title: 'Hardening Plugin',
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart] = await core.getStartServices();
        coreStart.chrome.docTitle.change('Hardening test');
        return renderApp(coreStart, params);
      },
    });

    // Return methods that should be available to other plugins
    return {};
  }

  public start() {}
  public stop() {}
}

export type HardeningPluginSetup = ReturnType<HardeningPlugin['setup']>;
export type HardeningPluginStart = ReturnType<HardeningPlugin['start']>;
