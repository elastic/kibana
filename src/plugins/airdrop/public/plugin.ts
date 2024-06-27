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
import { mountOverlay } from './mount_overlay';

export class AirdropPlugin
  implements Plugin<AirdropPluginSetup, AirdropPluginStart, object, AppPluginStartDependencies>
{
  private airdropService = new AirdropService();
  private pluginStart: AirdropPluginStart | null = null;

  public setup(core: CoreSetup<AppPluginStartDependencies>): AirdropPluginSetup {
    const _this = this;

    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      visibleIn: ['globalSearch', 'sideNav'],
      euiIconType: 'watchesApp',
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();
        const airdrop = _this.pluginStart;
        if (!airdrop) {
          throw new Error('Airdrop plugin is not yet started');
        }
        return renderApp(coreStart, { ...depsStart, airdrop }, params);
      },
    });

    this.airdropService.setup();

    // Return methods that should be available to other plugins
    return {};
  }

  public start(core: CoreStart): AirdropPluginStart {
    AirdropService.createDropElement().then((element) => {
      if (!element) return;

      mountOverlay({ airdropService: this.airdropService }, { element });
    });

    this.pluginStart = {
      ...this.airdropService.start(),
    };

    return this.pluginStart;
  }

  public stop() {}
}
