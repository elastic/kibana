/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  BehaviorSubject,
  catchError,
  combineLatest,
  map,
  Observable,
  of,
  ReplaySubject,
  Subject,
  Subscription,
  takeUntil,
} from 'rxjs';
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
  ChromeHelpExtension,
} from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { KIBANA_ASK_ELASTIC_LINK } from '@kbn/core-chrome-browser-internal/src/constants';
import {
  HelpCenterLinks,
  HelpCenterPluginBrowserConfig,
  HelpCenterPluginStartDependencies,
} from './types';
import { HelpCenterNavButton } from './components/help_center_header_nav_button';
import { getApi, HelpCenterApi, HelpCenterApiEndpoint } from './lib/api';
import { ChromeGlobalHelpExtensionMenuLink } from '@kbn/core-chrome-browser';

export type HelpCenterPublicPluginSetup = ReturnType<HelpCenterPublicPlugin['setup']>;
export type HelpCenterPublicPluginStart = ReturnType<HelpCenterPublicPlugin['start']>;

export class HelpCenterPublicPlugin
  implements Plugin<HelpCenterPublicPluginSetup, HelpCenterPublicPluginStart>
{
  private readonly kibanaVersion: string;
  private readonly config: HelpCenterPluginBrowserConfig;
  private readonly stop$ = new ReplaySubject<void>(1);
  // private kibanaDocLink: string = '';
  private helpCenterLinksSubject?: Observable<HelpCenterLinks>;

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

    this.helpCenterLinksSubject = combineLatest([
      core.chrome.getHelpExtension$(),
      core.chrome.getHelpSupportUrl$(),
      core.chrome.getGlobalHelpExtensionMenuLinks$(),
    ]).pipe(
      takeUntil(this.stop$),
      map(([helpExtension, helpSupportLink, globalHelpExtensionMenuLinks]) => {
        return {
          kibanaDocLink: core.docLinks.links.kibana.guide,
          helpExtension,
          helpSupportLink,
          globalHelpExtensionMenuLinks,
        };
      })
    );
    // .subscribe(([helpExtension, helpSupportLink, globalHelpExtensionMenuLinks]) => {
    //   console.log('subscription', helpExtension, helpSupportLink, globalHelpExtensionMenuLinks);
    //   this.helpExtension = helpExtension;
    //   this.helpSupportLink = helpSupportLink;
    //   this.globalHelpExtensionMenuLinks = globalHelpExtensionMenuLinks;
    // });

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
    this.helpLinksSubscription?.unsubscribe();
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
        catchError(() => of(null)) // do not throw error
      ),
    };
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
          <HelpCenterNavButton
            helpCenterApi={api}
            hasCustomBranding$={hasCustomBranding$}
            // kibanaDocLink={this.kibanaDocLink}
            helpCenterLinksSubject={this.helpCenterLinksSubject}
            // helpExtension={this.helpExtension}
            // helpSupportLink={this.helpSupportLink}
            // globalHelpExtensionMenuLinks={this.globalHelpExtensionMenuLinks}
          />
        </I18nProvider>
      </KibanaThemeProvider>,
      targetDomElement
    );
    return () => ReactDOM.unmountComponentAtNode(targetDomElement);
  }
}
