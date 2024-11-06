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
import type { PluginInitializer } from '@kbn/core-plugins-browser';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { MOCK_IDP_LOGIN_PATH } from '@kbn/mock-idp-utils/src/constants';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';

import { RoleSwitcher } from './role_switcher';

export interface PluginSetupDependencies {
  cloud?: CloudSetup;
}

export interface PluginStartDependencies {
  cloud?: CloudStart;
}

export const plugin: PluginInitializer<
  void,
  void,
  PluginSetupDependencies,
  PluginStartDependencies
> = () => ({
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
          <KibanaThemeProvider theme={coreStart.theme}>
            <KibanaContextProvider services={coreStart}>
              <I18nProvider>
                <LoginPage />
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
    // Register role switcher dropdown menu in the top right navigation of the Kibana UI
    coreStart.chrome.navControls.registerRight({
      order: 4000 + 1, // Make sure it comes after the user menu
      mount: (element: HTMLElement) => {
        ReactDOM.render(
          <KibanaThemeProvider theme={coreStart.theme}>
            <KibanaContextProvider services={coreStart}>
              <I18nProvider>
                <RoleSwitcher />
              </I18nProvider>
            </KibanaContextProvider>
          </KibanaThemeProvider>,
          element
        );
        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });
  },
  stop() {},
});
