/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ReactDOM from 'react-dom';
import React from 'react';
import * as Rx from 'rxjs';
import { I18nProvider } from '@kbn/i18n-react';
import {
  CoreSetup,
  CoreStart,
  Plugin,
  CoreTheme,
  ApplicationStart,
  NotificationsStart,
} from '@kbn/core/public';

import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';

import { PLUGIN_FEATURE } from '../common/constants';
import type {
  AppPluginStartDependencies,
  GuidedOnboardingPluginSetup,
  GuidedOnboardingPluginStart,
} from './types';
import { GuidePanel } from './components';
import { ApiService, apiService } from './services/api.service';

export class GuidedOnboardingPlugin
  implements Plugin<GuidedOnboardingPluginSetup, GuidedOnboardingPluginStart>
{
  constructor() {}
  public setup(core: CoreSetup): GuidedOnboardingPluginSetup {
    return {};
  }

  public start(
    core: CoreStart,
    { cloud }: AppPluginStartDependencies
  ): GuidedOnboardingPluginStart {
    const { chrome, http, theme, application, notifications } = core;

    // Guided onboarding UI is only available on cloud and if the access to the Kibana feature is granted
    const isEnabled = !!(cloud?.isCloudEnabled && application.capabilities[PLUGIN_FEATURE].enabled);
    // Initialize services
    apiService.setup(http, isEnabled);

    if (isEnabled) {
      chrome.navControls.registerExtension({
        order: 1000,
        mount: (target) =>
          this.mount({
            targetDomElement: target,
            theme$: theme.theme$,
            api: apiService,
            application,
            notifications,
          }),
      });
    }

    // Return methods that should be available to other plugins
    return {
      guidedOnboardingApi: apiService,
    };
  }

  public stop() {}

  private mount({
    targetDomElement,
    theme$,
    api,
    application,
    notifications,
  }: {
    targetDomElement: HTMLElement;
    theme$: Rx.Observable<CoreTheme>;
    api: ApiService;
    application: ApplicationStart;
    notifications: NotificationsStart;
  }) {
    ReactDOM.render(
      <KibanaThemeProvider theme$={theme$}>
        <I18nProvider>
          <GuidePanel
            api={api}
            application={application}
            notifications={notifications}
            theme$={theme$}
          />
        </I18nProvider>
      </KibanaThemeProvider>,
      targetDomElement
    );
    return () => ReactDOM.unmountComponentAtNode(targetDomElement);
  }
}
