/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { PluginBPluginSetup, PluginBPluginStart, AppPluginStartDependencies } from './types';
import { PLUGIN_NAME } from '../common';

export class PluginBPlugin implements Plugin<PluginBPluginSetup, PluginBPluginStart> {
  public setup(core: CoreSetup): PluginBPluginSetup {
    // Register an application into the side navigation menu
    core.application.register({
      id: 'pluginB',
      title: PLUGIN_NAME,
      async mount(params: AppMountParameters) {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services as specified in kibana.json
        const [coreStart, depsStart] = await core.getStartServices();
        // Render the application
        return renderApp(coreStart, depsStart as AppPluginStartDependencies, params);
      },
    });

    // Return methods that should be available to other plugins
    return {
      getGreeting() {
        return i18n.translate('pluginB.greetingText', {
          defaultMessage: 'Hello from {name}!',
          values: {
            name: PLUGIN_NAME,
          },
        });
      },
    };
  }

  public start(core: CoreStart): PluginBPluginStart {
    return {};
  }

  public stop() {}
}
