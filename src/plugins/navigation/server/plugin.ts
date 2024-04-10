/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';

import type { NavigationConfig } from './config';
import type {
  NavigationServerSetup,
  NavigationServerSetupDependencies,
  NavigationServerStart,
  NavigationServerStartDependencies,
} from './types';
import { getUiSettings } from './ui_settings';

export class NavigationServerPlugin
  implements
    Plugin<
      NavigationServerSetup,
      NavigationServerStart,
      NavigationServerSetupDependencies,
      NavigationServerStartDependencies
    >
{
  constructor(private initializerContext: PluginInitializerContext) {}

  setup(
    core: CoreSetup<NavigationServerStartDependencies>,
    plugins: NavigationServerSetupDependencies
  ) {
    if (plugins.cloud?.isCloudEnabled && !this.isServerless()) {
      const config = this.initializerContext.config.get<NavigationConfig>();

      core.uiSettings.registerGlobal(getUiSettings(config));
      // core.getStartServices().then(([coreStart, deps]) => {
      //   deps.cloudExperiments?.getVariation(SOLUTION_NAV_FEATURE_FLAG_NAME, false).then((value) => {
      //     if (value) {
      //       core.uiSettings.registerGlobal(getUiSettings(config));
      //     } else {
      //       this.removeUiSettings(coreStart, getUiSettings(config));
      //     }
      //   });
      // });
    }

    return {};
  }

  start(core: CoreStart, plugins: NavigationServerStartDependencies) {
    return {};
  }

  private isServerless() {
    return this.initializerContext.env.packageInfo.buildFlavor === 'serverless';
  }
}
