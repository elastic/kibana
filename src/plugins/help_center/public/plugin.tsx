/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import ReactDOM from 'react-dom';
import React from 'react';
import moment from 'moment';
import { I18nProvider } from '@kbn/i18n-react';
import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  CoreTheme,
  Plugin,
} from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { HelpCenterPluginBrowserConfig, HelpCenterPluginStartDependencies } from './types';
import { HelpCenterNavButton } from './components/help_center_header_nav_button';
import { getApi, HelpCenterApi, HelpCenterApiEndpoint } from './lib/api';

export type HelpCenterPublicPluginSetup = ReturnType<HelpCenterPublicPlugin['setup']>;
export type HelpCenterPublicPluginStart = ReturnType<HelpCenterPublicPlugin['start']>;

export class HelpCenterPublicPlugin
  implements Plugin<HelpCenterPublicPluginSetup, HelpCenterPublicPluginStart>
{
  private readonly kibanaVersion: string;
  private readonly config: HelpCenterPluginBrowserConfig;
  private readonly stop$ = new Rx.ReplaySubject<void>(1);

  constructor(initializerContext: PluginInitializerContext<HelpCenterPluginBrowserConfig>) {
    this.kibanaVersion = initializerContext.env.packageInfo.version;
    const config = initializerContext.config.get();
    this.config = Object.freeze({
      ...config,
      // We need wrap them in moment.duration because exposeToBrowser stringifies it.
      mainInterval: moment.duration(config.mainInterval),
      fetchInterval: moment.duration(config.fetchInterval),
    });
  }

  public setup(core: CoreSetup) {
    return {};
  }

  public start(core: CoreStart, { screenshotMode }: HelpCenterPluginStartDependencies) {
    const isScreenshotMode = screenshotMode.isScreenshotMode();

    const api = this.createHelpCenterApi(
      this.config,
      HelpCenterApiEndpoint.KIBANA,
      isScreenshotMode
    );
    console.log('START!!!');
    core.chrome.navControls.registerRight({
      order: 1000,
      mount: (target) =>
        this.mount(api, target, core.theme.theme$, core.customBranding.hasCustomBranding$),
    });

    return {
      createHelpCenter$: (endpoint: HelpCenterApiEndpoint) => {
        const config = Object.assign({}, this.config, {
          service: {
            ...this.config.service,
            pathTemplate: `/${endpoint}/v{VERSION}.json`,
          },
        });
        const { fetchResults$ } = this.createHelpCenterApi(config, endpoint, isScreenshotMode);
        return fetchResults$;
      },
    };
  }

  public stop() {
    this.stop$.next();
  }

  private createHelpCenterApi(
    config: HelpCenterPluginBrowserConfig,
    HelpCenterId: HelpCenterApiEndpoint,
    isScreenshotMode: boolean
  ): HelpCenterApi {
    const api = getApi(config, this.kibanaVersion, HelpCenterId, isScreenshotMode);
    return {
      markAsRead: api.markAsRead,
      fetchResults$: api.fetchResults$.pipe(
        takeUntil(this.stop$), // stop the interval when stop method is called
        catchError(() => Rx.of(null)) // do not throw error
      ),
    };
  }

  private mount(
    api: HelpCenterApi,
    targetDomElement: HTMLElement,
    theme$: Rx.Observable<CoreTheme>,
    hasCustomBranding$: Rx.Observable<boolean>
  ) {
    ReactDOM.render(
      <KibanaThemeProvider theme$={theme$}>
        <I18nProvider>
          <HelpCenterNavButton HelpCenterApi={api} hasCustomBranding$={hasCustomBranding$} />
        </I18nProvider>
      </KibanaThemeProvider>,
      targetDomElement
    );
    return () => ReactDOM.unmountComponentAtNode(targetDomElement);
  }
}
