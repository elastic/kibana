/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AppMountParameters, CoreSetup, Plugin, AppNavLinkStatus } from '@kbn/core/public';
import { PLUGIN_NAME } from '../common';
import type { SetupDependencies, StartDependencies } from './types';

export class FilesManagementPlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  public setup(core: CoreSetup<StartDependencies>, { management }: SetupDependencies): void {
    core.application.register({
      id: 'filesManagement',
      navLinkStatus: AppNavLinkStatus.hidden,
      title: PLUGIN_NAME,
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();
        return renderApp(coreStart, depsStart, params);
      },
    });
  }

  public start() {}
}
