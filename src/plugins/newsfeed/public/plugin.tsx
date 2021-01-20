/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import * as Rx from 'rxjs';
import { catchError, takeUntil, share } from 'rxjs/operators';
import ReactDOM from 'react-dom';
import React from 'react';
import moment from 'moment';
import { I18nProvider } from '@kbn/i18n/react';
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { NewsfeedPluginBrowserConfig, FetchResult } from './types';
import { NewsfeedNavButton, NewsfeedApiFetchResult } from './components/newsfeed_header_nav_button';
import { getApi, NewsfeedApiEndpoint } from './lib/api';

export type NewsfeedPublicPluginSetup = ReturnType<NewsfeedPublicPlugin['setup']>;
export type NewsfeedPublicPluginStart = ReturnType<NewsfeedPublicPlugin['start']>;

export class NewsfeedPublicPlugin
  implements Plugin<NewsfeedPublicPluginSetup, NewsfeedPublicPluginStart> {
  private readonly kibanaVersion: string;
  private readonly config: NewsfeedPluginBrowserConfig;
  private readonly stop$ = new Rx.ReplaySubject(1);

  constructor(initializerContext: PluginInitializerContext<NewsfeedPluginBrowserConfig>) {
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

  public start(core: CoreStart) {
    const api$ = this.fetchNewsfeed(core, this.config).pipe(share());
    core.chrome.navControls.registerRight({
      order: 1000,
      mount: (target) => this.mount(api$, target),
    });

    return {
      createNewsFeed$: (endpoint: NewsfeedApiEndpoint) => {
        const config = Object.assign({}, this.config, {
          service: { pathTemplate: `/${endpoint}/v{VERSION}.json` },
        });
        return this.fetchNewsfeed(core, config);
      },
    };
  }

  public stop() {
    this.stop$.next();
  }

  private fetchNewsfeed(
    core: CoreStart,
    config: NewsfeedPluginBrowserConfig
  ): Rx.Observable<FetchResult | null | void> {
    const { http } = core;
    return getApi(http, config, this.kibanaVersion).pipe(
      takeUntil(this.stop$), // stop the interval when stop method is called
      catchError(() => Rx.of(null)) // do not throw error
    );
  }

  private mount(api$: NewsfeedApiFetchResult, targetDomElement: HTMLElement) {
    ReactDOM.render(
      <I18nProvider>
        <NewsfeedNavButton apiFetchResult={api$} />
      </I18nProvider>,
      targetDomElement
    );
    return () => ReactDOM.unmountComponentAtNode(targetDomElement);
  }
}
