/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { AirdropPluginSetup, AirdropPluginStart, AppPluginStartDependencies } from './types';
import { PLUGIN_NAME, PLUGIN_ID } from '../common';
import { AirdropService } from './airdrop_service';

export class AirdropPlugin
  implements Plugin<AirdropPluginSetup, AirdropPluginStart, object, AppPluginStartDependencies>
{
  private airdropService = new AirdropService();

  public setup(core: CoreSetup<AppPluginStartDependencies>): AirdropPluginSetup {
    // Register an application into the side navigation menu
    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      visibleIn: ['globalSearch', 'sideNav'],
      euiIconType: 'watchesApp',
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();
        return renderApp(coreStart, depsStart, params);
      },
    });

    this.airdropService.setup();

    // Return methods that should be available to other plugins
    return {};
  }

  public start(core: CoreStart): AirdropPluginStart {
    this.airdropService.start();

    return {};
  }

  public stop() {}
}
