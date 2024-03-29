/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { UiSettingsParams } from '@kbn/core/types';

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

  setup(core: CoreSetup, plugins: NavigationServerSetupDependencies) {
    if (!this.isServerless()) {
      const config = this.initializerContext.config.get<NavigationConfig>();

      if (config.solutionNavigation.featureOn) {
        core.uiSettings.registerGlobal(getUiSettings(config));
      }
    }

    return {};
  }

  start(core: CoreStart, plugins: NavigationServerStartDependencies) {
    const config = this.initializerContext.config.get<NavigationConfig>();

    if (!Boolean(config.solutionNavigation.featureOn)) {
      this.removeUiSettings(core, getUiSettings(config));
    }

    return {};
  }

  /**
   * Remove UI settings values that might have been set when the feature was enabled.
   * If the feature is disabled in kibana.yml, we want to remove the settings from the
   * saved objects.
   *
   * @param core CoreStart
   * @param uiSettings Navigation UI settings
   */
  private removeUiSettings(core: CoreStart, uiSettings: Record<string, UiSettingsParams>) {
    if (this.isServerless()) return;

    const savedObjectsClient = core.savedObjects.createInternalRepository();
    const uiSettingsClient = core.uiSettings.globalAsScopedToClient(savedObjectsClient);

    const keys = Object.keys(uiSettings);
    return uiSettingsClient.removeMany(keys, { validateKeys: false, handleWriteErrors: true });
  }

  private isServerless() {
    return this.initializerContext.env.packageInfo.buildFlavor === 'serverless';
  }
}
