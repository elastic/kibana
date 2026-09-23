/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';

import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { PluginInitializer, PluginInitializerContext } from '@kbn/core-plugins-browser';
import type { DeveloperToolbarStart } from '@kbn/developer-toolbar-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { MOCK_IDP_LOGIN_PATH } from '@kbn/mock-idp-utils/src/constants';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';

import type { ConfigType } from './config';
import { RoleSwitcher } from './role_switcher';

export interface PluginSetupDependencies {
  cloud?: CloudSetup;
}

export interface PluginStartDependencies {
  cloud?: CloudStart;
  developerToolbar?: DeveloperToolbarStart;
}

export const plugin: PluginInitializer<
  void,
  void,
  PluginSetupDependencies,
  PluginStartDependencies
> = (initializerContext: PluginInitializerContext<ConfigType>) => {
  let unregisterRoleSwitcher: (() => void) | undefined;

  return {
    setup(coreSetup, plugins) {
      // Register Mock IDP login page
      coreSetup.http.anonymousPaths.register(MOCK_IDP_LOGIN_PATH);
      coreSetup.application.register({
        id: 'mock_idp',
        title: 'Mock IDP',
        chromeless: true,
        appRoute: MOCK_IDP_LOGIN_PATH,
        visibleIn: [],
        mount: async (params) => {
          const [[coreStart], { LoginPage }] = await Promise.all([
            coreSetup.getStartServices(),
            import('./login_page'),
          ]);

          ReactDOM.render(
            <KibanaThemeProvider {...coreStart}>
              <KibanaContextProvider services={coreStart}>
                <I18nProvider>
                  <LoginPage config={initializerContext.config.get()} />
                </I18nProvider>
              </KibanaContextProvider>
            </KibanaThemeProvider>,
            params.element
          );

          return () => ReactDOM.unmountComponentAtNode(params.element);
        },
      });
    },
    start(coreStart, plugins) {
      if (!plugins.developerToolbar) {
        return;
      }

      unregisterRoleSwitcher = plugins.developerToolbar.registerItem({
        id: 'Role Switcher',
        priority: 1,
        children: (
          <KibanaContextProvider services={coreStart}>
            <RoleSwitcher />
          </KibanaContextProvider>
        ),
      });
    },
    stop() {
      unregisterRoleSwitcher?.();
    },
  };
};
