/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { UserSettingsService } from '@kbn/core-user-settings-browser';
import { AppSetupDeps, AppStartDeps, AppServices } from './types';
import { spaceAgnosticSetting, tableConfigurationSetting } from './constants';

const PLUGIN_ID = 'userSettingsExample';
const PLUGIN_NAME = 'User Settings Example';

export class UserSettingsExamplePlugin implements Plugin<{}, {}, AppSetupDeps, AppStartDeps> {
  public setup(core: CoreSetup, { developerExamples }: AppSetupDeps) {
    // Register an application into the side navigation menu
    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      mount: async (params: AppMountParameters) => {
        // Load application bundle
        const { renderApp } = await import('./app');
        // Get start services as specified in kibana.json
        const [coreStart, depsStart] = await core.getStartServices();
        // Register the user Settings for this particular plugin

        const userSettingsService = await this.getUserSettingsService(
          coreStart,
          depsStart as AppStartDeps
        );
        await userSettingsService.registerSettings([
          // Register the table configuration setting
          tableConfigurationSetting,
          spaceAgnosticSetting,
        ]);

        const appServices: AppServices = {
          ...(depsStart as AppStartDeps),
          userSettings: userSettingsService,
        };

        // Render the application
        return renderApp(coreStart, appServices, params);
      },
    });

    developerExamples.register({
      appId: PLUGIN_ID,
      title: PLUGIN_NAME,
      description: `Examples of user settings functionality.`,
    });

    return {};
  }

  private async getUserSettingsService(core: CoreStart, depsStart: AppStartDeps) {
    const space = await depsStart.spaces.getActiveSpace();
    return new UserSettingsService(core.userProfile, space.id, PLUGIN_ID);
  }

  public start(_core: CoreStart) {
    return {};
  }

  public stop() {}
}
