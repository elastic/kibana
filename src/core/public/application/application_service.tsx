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
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import React from 'react';

import { InjectedMetadataStart } from '../injected_metadata';
import { CapabilitiesService } from './capabilities';
import { AppRouter } from './ui';
import { HttpStart } from '../http';
import { ContextSetup, IContextContainer } from '../context';
import {
  App,
  AppBase,
  AppMounter,
  AppStatus,
  AppStatusUpdater,
  AppUpdatableFields,
  InternalApplicationSetup,
  InternalApplicationStart,
  LegacyApp,
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
  app: AppBase;
  mount: AppMounter;
}

function isLegacyApp(app: AppBox | LegacyApp): app is LegacyApp {
  return (app as AppBox).mount === undefined;
}

const allApplicationsFilter = '__ALL__';

interface AppStatusUpdaterWrapper {
  application: string;
  updater: AppStatusUpdater;
}

/**
 * Service that is responsible for registering new applications.
 * @internal
 */
export class ApplicationService {
  private started = false;
  private readonly apps = new Map<string, AppBox | LegacyApp>();
  private readonly statusUpdaters$ = new BehaviorSubject<Map<symbol, AppStatusUpdaterWrapper>>(
    new Map()
  );

  private readonly capabilities = new CapabilitiesService();
  private mountContext?: IContextContainer<App['mount']>;

  public setup({ context }: SetupDeps): InternalApplicationSetup {
    this.mountContext = context.createContextContainer();

    const registerStatusUpdater = (application: string, updater$: Observable<AppStatusUpdater>) => {
      const updaterId = Symbol();
      updater$.subscribe(updater => {
        const nextValue = new Map(this.statusUpdaters$.getValue());
        nextValue.set(updaterId, {
          application,
          updater,
        });
        this.statusUpdaters$.next(nextValue);
      });
    };

    return {
      register: (plugin: symbol, app: App) => {
        if (this.apps.has(app.id)) {
          throw new Error(`An application is already registered with the id "${app.id}"`);
        }
        if (this.started) {
          throw new Error(`Applications cannot be registered after "setup"`);
        }
        const { status, statusUpdater$, ...appProps } = app;
        const appBox: AppBox = {
          app: {
            ...appProps,
            status: app.status !== undefined ? app.status : AppStatus.accessible,
            legacy: false,
          },
          mount: this.mountContext!.createHandler(plugin, app.mount),
        };
        this.apps.set(app.id, appBox);
        if (statusUpdater$) {
          registerStatusUpdater(app.id, statusUpdater$);
        }
      },
      registerLegacyApp: (app: LegacyApp) => {
        if (this.apps.has(app.id)) {
          throw new Error(`A legacy application is already registered with the id "${app.id}"`);
        }
        if (this.started) {
          throw new Error(`Applications cannot be registered after "setup"`);
        }
        const { status, statusUpdater$, ...appProps } = app;
        this.apps.set(app.id, {
          ...appProps,
          status: app.status !== undefined ? app.status : AppStatus.accessible,
          legacy: true,
        });
        if (statusUpdater$) {
          registerStatusUpdater(app.id, statusUpdater$);
        }
      },
      registerAppStatusUpdater: (statusUpdater$: Observable<AppStatusUpdater>) =>
        registerStatusUpdater(allApplicationsFilter, statusUpdater$),
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
    this.started = true;

    const legacyMode = injectedMetadata.getLegacyMode();
    const currentAppId$ = new BehaviorSubject<string | undefined>(undefined);
    const { availableApps, capabilities } = await this.capabilities.start({
      apps: new Map(
        [...this.apps].map(([id, appBox]) => [
          id,
          (isLegacyApp(appBox) ? appBox : appBox.app) as App | LegacyApp,
        ])
      ),
      injectedMetadata,
    });

    // Only setup history if we're not in legacy mode
    const history = legacyMode ? null : createBrowserHistory({ basename: http.basePath.get() });

    const availableApps$ = new BehaviorSubject<ReadonlyMap<string, App | LegacyApp>>(availableApps);

    combineLatest([
      of(availableApps),
      this.statusUpdaters$.pipe(map(statusUpdaters => [...statusUpdaters.values()])),
    ])
      .pipe(
        map(([apps, statusUpdaters]) => {
          return new Map([...apps].map(([id, app]) => [id, updateStatus(app, statusUpdaters)]));
        }),
        map(apps => {
          return new Map([...apps].filter(([id, app]) => app.status !== AppStatus.inaccessible));
        })
      )
      .subscribe(apps => availableApps$.next(apps));

    return {
      availableApps$,
      capabilities,
      registerMountContext: this.mountContext.registerContext,
      currentAppId$,

      getUrlForApp: (appId, options: { path?: string } = {}) => {
        return http.basePath.prepend(appPath(appId, options));
      },

      navigateToApp: (appId, { path, state }: { path?: string; state?: any } = {}) => {
        if (this.apps.get(appId) === undefined) {
          throw new Error(`Trying to navigate to an unknown application: ${appId}`);
        }
        const app = availableApps$.value.get(appId);
        if (app === undefined || app.status !== AppStatus.accessible) {
          throw new Error(`Trying to navigate to an inaccessible application: ${appId}`);
        }

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
        const appMounters = new Map<string, AppMounter>(
          [...this.apps]
            .filter(([id, app]) => availableApps.has(id) && !isLegacyApp(app))
            .map(([id, app]) => [id, (app as AppBox).mount])
        );

        const legacyApps = new Map<string, LegacyApp>(
          [...this.apps]
            .filter(([id, app]) => availableApps.has(id) && isLegacyApp(app))
            .map(([id, app]) => [id, app as LegacyApp])
        );

        return (
          <AppRouter
            apps={appMounters}
            legacyApps={legacyApps}
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

const updateStatus = <T extends AppBase>(app: T, statusUpdaters: AppStatusUpdaterWrapper[]): T => {
  let changes: Partial<AppUpdatableFields> = {};
  statusUpdaters.forEach(wrapper => {
    if (wrapper.application !== allApplicationsFilter && wrapper.application !== app.id) {
      return;
    }
    const fields = wrapper.updater(app);
    if (fields) {
      changes = {
        ...changes,
        ...fields,
        status: Math.max(changes.status || 0, fields.status || 0),
      };
    }
  });
  return {
    ...app,
    ...changes,
  };
};

const appPath = (appId: string, { path }: { path?: string } = {}): string =>
  path
    ? `/app/${appId}/${path.replace(/^\//, '')}` // Remove preceding slash from path if present
    : `/app/${appId}`;
