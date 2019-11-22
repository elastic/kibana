/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { createBrowserHistory, History } from 'history';

import { InjectedMetadataSetup, InjectedMetadataStart } from '../injected_metadata';
import { HttpSetup } from '../http';
import { ContextSetup, IContextContainer } from '../context';
import { AppRouter } from './ui';
import { CapabilitiesService, Capabilities } from './capabilities';
import {
  App,
  LegacyApp,
  AppMounter,
  LegacyAppMounter,
  Mounter,
  InternalApplicationSetup,
  InternalApplicationStart,
} from './types';

interface SetupDeps {
  context: ContextSetup;
  http: HttpSetup;
  injectedMetadata: InjectedMetadataSetup;
  /**
   * Only necessary for redirecting to legacy apps
   * @deprecated
   */
  redirectTo?: (path: string) => void;
}

interface StartDeps {
  injectedMetadata: InjectedMetadataStart;
}

const filterAvailable = (map: Map<string, any>, capabilities: Capabilities) =>
  new Map(
    [...map].filter(
      ([id]) => capabilities.navLinks[id] === undefined || capabilities.navLinks[id] === true
    )
  );
const hasAppBasePath = (mounters: Map<string, Mounter>, appBasePath?: string) =>
  [...mounters.values()].some(mounter => mounter.appBasePath === appBasePath);
const getAppUrl = (mounters: Map<string, Mounter>, appId: string, path: string = '') =>
  `/${mounters.get(appId)?.appBasePath ?? `/app/${appId}`}/${path}`
    .replace(/\/{2,}/g, '/') // Remove duplicate slashes
    .replace(/\/$/, ''); // Remove trailing slash

/**
 * Service that is responsible for registering new applications.
 * @internal
 */
export class ApplicationService {
  private readonly apps = new Map<string, App>();
  private readonly legacyApps = new Map<string, LegacyApp>();
  private readonly mounters = new Map<string, Mounter>();
  private readonly capabilities = new CapabilitiesService();
  private registrationClosed = false;
  private history: History<any> | null = null;
  private mountContext?: IContextContainer<App['mount']>;
  private currentAppId$?: BehaviorSubject<string | undefined>;
  private navigate?: (url: string, state: any) => void;

  public setup({
    context,
    http: { basePath },
    injectedMetadata,
    redirectTo = (path: string) => (window.location.href = path),
  }: SetupDeps): InternalApplicationSetup {
    // Only setup history if we're not in legacy mode
    if (!injectedMetadata.getLegacyMode()) {
      this.history = createBrowserHistory({ basename: basePath.get() });
    }

    // If we do not have history available, use redirectTo to do a full page refresh.
    this.navigate = (url, state) =>
      this.history ? this.history.push(url, state) : redirectTo(basePath.prepend(url));
    this.mountContext = context.createContextContainer();

    return {
      registerMountContext: this.mountContext!.registerContext,
      register: (plugin, app) => {
        app = { appBasePath: `/app/${app.id}`, ...app };

        if (this.registrationClosed) {
          throw new Error(`Applications cannot be registered after "setup"`);
        } else if (this.apps.has(app.id)) {
          throw new Error(`An application is already registered with the id "${app.id}"`);
        } else if (hasAppBasePath(this.mounters, app.appBasePath)) {
          throw new Error(
            `An application is already registered with the appBasePath "${app.appBasePath}"`
          );
        }

        const handler = this.mountContext!.createHandler(plugin, app.mount);
        const mount: AppMounter = async params => {
          const unmount = await handler(params);
          this.currentAppId$!.next(app.id);
          return unmount;
        };
        this.apps.set(app.id, app);
        this.mounters.set(app.id, { appBasePath: app.appBasePath!, mount });
      },
      registerLegacyApp: app => {
        const appBasePath = `/app/${app.id.split(':')[0]}`;

        if (this.registrationClosed) {
          throw new Error(`Applications cannot be registered after "setup"`);
        } else if (this.legacyApps.has(app.id)) {
          throw new Error(`A legacy application is already registered with the id "${app.id}"`);
        } else if (hasAppBasePath(this.mounters, appBasePath)) {
          throw new Error(
            `An application is already registered with the appBasePath "${appBasePath}"`
          );
        }

        const mount: LegacyAppMounter = () => redirectTo(basePath.prepend(appBasePath));
        this.legacyApps.set(app.id, app);
        this.mounters.set(app.id, { appBasePath, mount, unmountBeforeMounting: true });
      },
    };
  }

  public async start({ injectedMetadata }: StartDeps): Promise<InternalApplicationStart> {
    if (!this.mountContext) {
      throw new Error('ApplicationService#setup() must be invoked before start.');
    }

    this.registrationClosed = true;
    this.currentAppId$ = new BehaviorSubject<string | undefined>(undefined);
    const { capabilities } = await this.capabilities.start({ injectedMetadata });
    const availableMounters = filterAvailable(this.mounters, capabilities);

    return {
      availableApps: filterAvailable(this.apps, capabilities),
      availableLegacyApps: filterAvailable(this.legacyApps, capabilities),
      capabilities,
      currentAppId$: this.currentAppId$,
      registerMountContext: this.mountContext.registerContext,
      getUrlForApp: (appId, { path }: { path?: string } = {}) =>
        getAppUrl(availableMounters, appId, path),
      navigateToApp: (appId, { path, state }: { path?: string; state?: any } = {}) => {
        this.navigate!(getAppUrl(availableMounters, appId, path), state);
        this.currentAppId$!.next(appId);
      },
      getComponent: () =>
        this.history ? <AppRouter history={this.history} mounters={availableMounters} /> : null,
    };
  }

  public stop() {}
}
