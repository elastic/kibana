/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Rx from 'rxjs';
import { catchError, takeUntil } from 'rxjs';
import ReactDOM from 'react-dom';
import React from 'react';
import moment from 'moment';
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { NewsfeedPluginBrowserConfig, NewsfeedPluginStartDependencies } from './types';
import { NewsfeedNavButton } from './components/newsfeed_header_nav_button';
import { getApi, NewsfeedApi, NewsfeedApiEndpoint } from './lib/api';

export type NewsfeedPublicPluginSetup = ReturnType<NewsfeedPublicPlugin['setup']>;
export type NewsfeedPublicPluginStart = ReturnType<NewsfeedPublicPlugin['start']>;

export class NewsfeedPublicPlugin
  implements Plugin<NewsfeedPublicPluginSetup, NewsfeedPublicPluginStart>
{
  private readonly kibanaVersion: string;
  private readonly config: NewsfeedPluginBrowserConfig;
  private readonly stop$ = new Rx.ReplaySubject<void>(1);

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

  public setup(_core: CoreSetup) {
    return {};
  }

  public start(core: CoreStart, { screenshotMode }: NewsfeedPluginStartDependencies) {
    const isScreenshotMode = screenshotMode.isScreenshotMode();

    const api = this.createNewsfeedApi(this.config, NewsfeedApiEndpoint.KIBANA, isScreenshotMode);
    core.chrome.navControls.registerRight({
      order: 1000,
      mount: (target) => this.mount(api, target, core),
    });

    return {
      createNewsFeed$: (endpoint: NewsfeedApiEndpoint) => {
        const config = Object.assign({}, this.config, {
          service: {
            ...this.config.service,
            pathTemplate: `/${endpoint}/v{VERSION}.json`,
          },
        });
        const { fetchResults$ } = this.createNewsfeedApi(config, endpoint, isScreenshotMode);
        return fetchResults$;
      },
    };
  }

  public stop() {
    this.stop$.next();
  }

  private createNewsfeedApi(
    config: NewsfeedPluginBrowserConfig,
    newsfeedId: NewsfeedApiEndpoint,
    isScreenshotMode: boolean
  ): NewsfeedApi {
    const api = getApi(config, this.kibanaVersion, newsfeedId, isScreenshotMode);
    return {
      markAsRead: api.markAsRead,
      fetchResults$: api.fetchResults$.pipe(
        takeUntil(this.stop$), // stop the interval when stop method is called
        catchError(() => Rx.of(null)) // do not throw error
      ),
    };
  }

  private mount(api: NewsfeedApi, targetDomElement: HTMLElement, core: CoreStart) {
    const hasCustomBranding$ = core.customBranding.hasCustomBranding$;
    ReactDOM.render(
      <KibanaRenderContextProvider {...core}>
        <NewsfeedNavButton newsfeedApi={api} hasCustomBranding$={hasCustomBranding$} />
      </KibanaRenderContextProvider>,
      targetDomElement
    );
    return () => ReactDOM.unmountComponentAtNode(targetDomElement);
  }
}
