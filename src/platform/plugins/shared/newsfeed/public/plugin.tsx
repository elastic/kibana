/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Rx from 'rxjs';
import { catchError, shareReplay, takeUntil } from 'rxjs';
import React from 'react';
import moment from 'moment';
import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { SidebarComponentProps } from '@kbn/core-chrome-sidebar';
import type { NewsfeedPluginBrowserConfig, NewsfeedPluginStartDependencies } from './types';
import type { NewsfeedApi } from './lib/api';
import { getApi, NewsfeedApiEndpoint } from './lib/api';
import { registerNewsfeedHandler } from './register_newsfeed_handler';
import { createNewsfeedSidebarController } from './sidebar/controller';

export type NewsfeedPublicPluginSetup = ReturnType<NewsfeedPublicPlugin['setup']>;
export type NewsfeedPublicPluginStart = ReturnType<NewsfeedPublicPlugin['start']>;

export class NewsfeedPublicPlugin
  implements Plugin<NewsfeedPublicPluginSetup, NewsfeedPublicPluginStart>
{
  private readonly kibanaVersion: string;
  private readonly config: NewsfeedPluginBrowserConfig;
  private readonly stop$ = new Rx.ReplaySubject<void>(1);
  private newsfeedApi?: NewsfeedApi;

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
    // loadComponent is defined once here so its identity is stable — core uses it as a WeakMap
    // key for the lazy-component cache.
    const loadComponent = async () => {
      const [{ NewsfeedSidebar }, [coreStart]] = await Promise.all([
        import('./sidebar/newsfeed_sidebar'),
        core.getStartServices(),
      ]);

      const newsfeedApi = this.newsfeedApi;
      if (!newsfeedApi) {
        throw new Error(
          'Newsfeed API is not initialized. Ensure NewsfeedPublicPlugin.start() runs before loading the newsfeed sidebar.'
        );
      }
      const { hasCustomBranding$ } = coreStart.customBranding;

      return (props: SidebarComponentProps) => (
        <NewsfeedSidebar
          {...props}
          newsfeedApi={newsfeedApi}
          hasCustomBranding$={hasCustomBranding$}
        />
      );
    };

    core.chrome.sidebar.registerApp({
      appId: 'newsfeed',
      restoreOnReload: false,
      loadComponent,
    });

    return {};
  }

  public start(core: CoreStart, { screenshotMode }: NewsfeedPluginStartDependencies) {
    const isScreenshotMode = screenshotMode.isScreenshotMode();

    const api = this.createNewsfeedApi(this.config, NewsfeedApiEndpoint.KIBANA, isScreenshotMode);

    // The source fetches at most once per fetchInterval, so a second cold subscription would
    // never emit. The help menu and sidebar share one subscription instead, and late
    // subscribers replay the last result.
    const sharedApi: NewsfeedApi = {
      ...api,
      fetchResults$: api.fetchResults$.pipe(shareReplay({ bufferSize: 1, refCount: false })),
    };
    this.newsfeedApi = sharedApi;

    const sidebarController = createNewsfeedSidebarController({
      sidebar: core.chrome.sidebar,
      newsfeedApi: sharedApi,
    });

    registerNewsfeedHandler({ core, api: sharedApi, sidebarController });

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
}
