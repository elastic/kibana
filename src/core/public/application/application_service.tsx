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

import { createBrowserHistory } from 'history';
import { BehaviorSubject } from 'rxjs';
import React from 'react';

import { InjectedMetadataStart } from '../injected_metadata';
import { CapabilitiesService } from './capabilities';
import { AppRouter } from './ui';
import { HttpStart } from '../http';
import { ContextSetup, IContextContainer } from '../context';
import {
  App,
  LegacyApp,
  AppMount,
  AppMountDeprecated,
  InternalApplicationSetup,
  InternalApplicationStart,
} from './types';

interface SetupDeps {
  context: ContextSetup;
}

interface StartDeps {
  http: HttpStart;
  injectedMetadata: InjectedMetadataStart;
  /**
   * Only necessary for redirecting to legacy apps
   * @deprecated
   */
  redirectTo?: (path: string) => void;
}

interface AppBox {
  app: App;
  mount: AppMount;
}

/**
 * Service that is responsible for registering new applications.
 * @internal
 */
export class ApplicationService {
  private readonly apps$ = new BehaviorSubject<ReadonlyMap<string, AppBox>>(new Map());
  private readonly legacyApps$ = new BehaviorSubject<ReadonlyMap<string, LegacyApp>>(new Map());
  private readonly capabilities = new CapabilitiesService();
  private mountContext?: IContextContainer<AppMountDeprecated>;

  public setup({ context }: SetupDeps): InternalApplicationSetup {
    this.mountContext = context.createContextContainer();

    return {
      register: (plugin: symbol, app: App) => {
        if (this.apps$.value.has(app.id)) {
          throw new Error(`An application is already registered with the id "${app.id}"`);
        }
        if (this.apps$.isStopped) {
          throw new Error(`Applications cannot be registered after "setup"`);
        }

        let appBox: AppBox;
        if (isAppMountDeprecated(app.mount)) {
          // eslint-disable-next-line no-console
          console.warn(
            `App [${app.id}] is using deprecated mount context. Use core.getStartServices() instead.`
          );

          appBox = {
            app,
            mount: this.mountContext!.createHandler(plugin, app.mount),
          };
        } else {
          appBox = { app, mount: app.mount };
        }

        this.apps$.next(new Map([...this.apps$.value.entries(), [app.id, appBox]]));
      },
      registerLegacyApp: (app: LegacyApp) => {
        if (this.legacyApps$.value.has(app.id)) {
          throw new Error(`A legacy application is already registered with the id "${app.id}"`);
        }
        if (this.legacyApps$.isStopped) {
          throw new Error(`Applications cannot be registered after "setup"`);
        }

        this.legacyApps$.next(new Map([...this.legacyApps$.value.entries(), [app.id, app]]));
      },
      registerMountContext: this.mountContext!.registerContext,
    };
  }

  public async start({
    http,
    injectedMetadata,
    redirectTo = (path: string) => (window.location.href = path),
  }: StartDeps): Promise<InternalApplicationStart> {
    if (!this.mountContext) {
      throw new Error(`ApplicationService#setup() must be invoked before start.`);
    }

    // Disable registration of new applications
    this.apps$.complete();
    this.legacyApps$.complete();

    const legacyMode = injectedMetadata.getLegacyMode();
    const currentAppId$ = new BehaviorSubject<string | undefined>(undefined);
    const { availableApps, availableLegacyApps, capabilities } = await this.capabilities.start({
      http,
      apps: new Map([...this.apps$.value].map(([id, { app }]) => [id, app])),
      legacyApps: this.legacyApps$.value,
    });

    // Only setup history if we're not in legacy mode
    const history = legacyMode ? null : createBrowserHistory({ basename: http.basePath.get() });

    return {
      availableApps,
      availableLegacyApps,
      capabilities,
      registerMountContext: this.mountContext.registerContext,
      currentAppId$,

      getUrlForApp: (appId, options: { path?: string } = {}) => {
        return http.basePath.prepend(appPath(appId, options));
      },

      navigateToApp: (appId, { path, state }: { path?: string; state?: any } = {}) => {
        if (legacyMode) {
          // If we're in legacy mode, do a full page refresh to load the NP app.
          redirectTo(http.basePath.prepend(appPath(appId, { path })));
        } else {
          // basePath not needed here because `history` is configured with basename
          history!.push(appPath(appId, { path }), state);
        }
      },

      getComponent: () => {
        if (legacyMode) {
          return null;
        }

        // Filter only available apps and map to just the mount function.
        const appMounts = new Map<string, AppMount>(
          [...this.apps$.value]
            .filter(([id]) => availableApps.has(id))
            .map(([id, { mount }]) => [id, mount])
        );

        return (
          <AppRouter
            apps={appMounts}
            legacyApps={availableLegacyApps}
            basePath={http.basePath}
            currentAppId$={currentAppId$}
            history={history!}
            redirectTo={redirectTo}
          />
        );
      },
    };
  }

  public stop() {}
}

const appPath = (appId: string, { path }: { path?: string } = {}): string =>
  path
    ? `/app/${appId}/${path.replace(/^\//, '')}` // Remove preceding slash from path if present
    : `/app/${appId}`;

function isAppMountDeprecated(mount: (...args: any[]) => any): mount is AppMountDeprecated {
  // Mount functions with two arguments are assumed to expect deprecated `context` object.
  return mount.length === 2;
}
