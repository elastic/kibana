/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable, ReplaySubject } from 'rxjs';
import ReactDOM from 'react-dom';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  CoreTheme,
  Plugin,
} from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { HelpCenterPluginStartDependencies } from './types';
import { HelpCenterNavButton } from './components/help_center_header_nav_button';
import { getApi, HelpCenterApi } from './lib/api';

export type HelpCenterPublicPluginSetup = ReturnType<HelpCenterPublicPlugin['setup']>;
export type HelpCenterPublicPluginStart = ReturnType<HelpCenterPublicPlugin['start']>;

export class HelpCenterPublicPlugin
  implements Plugin<HelpCenterPublicPluginSetup, HelpCenterPublicPluginStart>
{
  private readonly kibanaVersion: string;
  private readonly stop$ = new ReplaySubject<void>(1);

  constructor(initializerContext: PluginInitializerContext) {
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  public setup(core: CoreSetup) {
    return {};
  }

  public start(core: CoreStart, { screenshotMode }: HelpCenterPluginStartDependencies) {
    const api = getApi(this.kibanaVersion, core, this.stop$);

    core.chrome.navControls.registerRight({
      order: 1000,
      mount: (target) =>
        this.mount(api, target, core.theme.theme$, core.customBranding.hasCustomBranding$),
    });
  }

  public stop() {
    this.stop$.next();
  }

  private mount(
    api: HelpCenterApi,
    targetDomElement: HTMLElement,
    theme$: Observable<CoreTheme>,
    hasCustomBranding$: Observable<boolean>
  ) {
    ReactDOM.render(
      <KibanaThemeProvider theme$={theme$}>
        <I18nProvider>
          <HelpCenterNavButton helpCenterApi={api} hasCustomBranding$={hasCustomBranding$} />
        </I18nProvider>
      </KibanaThemeProvider>,
      targetDomElement
    );
    return () => ReactDOM.unmountComponentAtNode(targetDomElement);
  }
}
