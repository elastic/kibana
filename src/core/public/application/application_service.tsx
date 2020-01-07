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
import { BehaviorSubject, combineLatest, Observable, of, Subject, Subscription } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { createBrowserHistory, History } from 'history';

import { InjectedMetadataSetup } from '../injected_metadata';
import { HttpSetup, HttpStart } from '../http';
import { ContextSetup, IContextContainer } from '../context';
import { AppRouter } from './ui';
import { Capabilities, CapabilitiesService } from './capabilities';
import {
  App,
  AppBase,
  AppMount,
  AppMountDeprecated,
  AppMounter,
  AppNavLinkStatus,
  AppStatus,
  AppUpdatableFields,
  AppUpdater,
  InternalApplicationSetup,
  InternalApplicationStart,
  LegacyApp,
  LegacyAppMounter,
  Mounter,
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
  http: HttpStart;
}

// Mount functions with two arguments are assumed to expect deprecated `context` object.
const isAppMountDeprecated = (mount: (...args: any[]) => any): mount is AppMountDeprecated =>
  mount.length === 2;
function filterAvailable<T>(m: Map<string, T>, capabilities: Capabilities) {
  return new Map(
    [...m].filter(
      ([id]) => capabilities.navLinks[id] === undefined || capabilities.navLinks[id] === true
    )
  );
}
const findMounter = (mounters: Map<string, Mounter>, appRoute?: string) =>
  [...mounters].find(([, mounter]) => mounter.appRoute === appRoute);
const getAppUrl = (mounters: Map<string, Mounter>, appId: string, path: string = '') =>
  `/${mounters.get(appId)?.appRoute ?? `/app/${appId}`}/${path}`
    .replace(/\/{2,}/g, '/') // Remove duplicate slashes
    .replace(/\/$/, ''); // Remove trailing slash

const allApplicationsFilter = '__ALL__';

interface AppUpdaterWrapper {
  application: string;
  updater: AppUpdater;
}

/**
 * Service that is responsible for registering new applications.
 * @internal
 */
export class ApplicationService {
  private readonly apps = new Map<string, App | LegacyApp>();
  private readonly mounters = new Map<string, Mounter>();
  private readonly capabilities = new CapabilitiesService();
  private currentAppId$ = new BehaviorSubject<string | undefined>(undefined);
  private readonly statusUpdaters$ = new BehaviorSubject<Map<symbol, AppUpdaterWrapper>>(new Map());
  private readonly subscriptions: Subscription[] = [];
  private stop$ = new Subject();
  private registrationClosed = false;
  private history?: History<any>;
  private mountContext?: IContextContainer<AppMountDeprecated>;
  private navigate?: (url: string, state: any) => void;

  public setup({
    context,
    http: { basePath },
    injectedMetadata,
    redirectTo = (path: string) => (window.location.href = path),
  }: SetupDeps): InternalApplicationSetup {
    const basename = basePath.get();
    // Only setup history if we're not in legacy mode
    if (!injectedMetadata.getLegacyMode()) {
      this.history = createBrowserHistory({ basename });
    }

    // If we do not have history available, use redirectTo to do a full page refresh.
    this.navigate = (url, state) =>
      // basePath not needed here because `history` is configured with basename
      this.history ? this.history.push(url, state) : redirectTo(basePath.prepend(url));

    this.mountContext = context.createContextContainer();

    const registerStatusUpdater = (application: string, updater$: Observable<AppUpdater>) => {
      const updaterId = Symbol();
      const subscription = updater$.subscribe(updater => {
        const nextValue = new Map(this.statusUpdaters$.getValue());
        nextValue.set(updaterId, {
          application,
          updater,
        });
        this.statusUpdaters$.next(nextValue);
      });
      this.subscriptions.push(subscription);
    };

    return {
      registerMountContext: this.mountContext!.registerContext,
      register: (plugin, app) => {
        app = { appRoute: `/app/${app.id}`, ...app };

        if (this.registrationClosed) {
          throw new Error(`Applications cannot be registered after "setup"`);
        } else if (this.apps.has(app.id)) {
          throw new Error(`An application is already registered with the id "${app.id}"`);
        } else if (findMounter(this.mounters, app.appRoute)) {
          throw new Error(
            `An application is already registered with the appRoute "${app.appRoute}"`
          );
        } else if (basename && app.appRoute!.startsWith(basename)) {
          throw new Error('Cannot register an application route that includes HTTP base path');
        }

        let handler: AppMount;

        if (isAppMountDeprecated(app.mount)) {
          handler = this.mountContext!.createHandler(plugin, app.mount);
          // eslint-disable-next-line no-console
          console.warn(
            `App [${app.id}] is using deprecated mount context. Use core.getStartServices() instead.`
          );
        } else {
          handler = app.mount;
        }

        const mount: AppMounter = async params => {
          const unmount = await handler(params);
          this.currentAppId$.next(app.id);
          return unmount;
        };

        const { updater$, ...appProps } = app;
        this.apps.set(app.id, {
          ...appProps,
          status: app.status !== undefined ? app.status : AppStatus.accessible,
          navLinkStatus:
            app.navLinkStatus !== undefined ? app.navLinkStatus : AppNavLinkStatus.default,
          legacy: false,
        });
        if (updater$) {
          registerStatusUpdater(app.id, updater$);
        }
        this.mounters.set(app.id, {
          appRoute: app.appRoute!,
          appBasePath: basePath.prepend(app.appRoute!),
          mount,
          unmountBeforeMounting: false,
        });
      },
      registerLegacyApp: app => {
        const appRoute = `/app/${app.id.split(':')[0]}`;

        if (this.registrationClosed) {
          throw new Error('Applications cannot be registered after "setup"');
        } else if (this.apps.has(app.id)) {
          throw new Error(`An application is already registered with the id "${app.id}"`);
        } else if (basename && appRoute!.startsWith(basename)) {
          throw new Error('Cannot register an application route that includes HTTP base path');
        }

        const appBasePath = basePath.prepend(appRoute);
        const mount: LegacyAppMounter = () => redirectTo(appBasePath);

        const { updater$, ...appProps } = app;
        this.apps.set(app.id, {
          ...appProps,
          status: app.status !== undefined ? app.status : AppStatus.accessible,
          navLinkStatus:
            app.navLinkStatus !== undefined ? app.navLinkStatus : AppNavLinkStatus.default,
          legacy: true,
        });
        if (updater$) {
          registerStatusUpdater(app.id, updater$);
        }
        this.mounters.set(app.id, {
          appRoute,
          appBasePath,
          mount,
          unmountBeforeMounting: true,
        });
      },
      registerAppUpdater: (appUpdater$: Observable<AppUpdater>) =>
        registerStatusUpdater(allApplicationsFilter, appUpdater$),
    };
  }

  public async start({ http }: StartDeps): Promise<InternalApplicationStart> {
    if (!this.mountContext) {
      throw new Error('ApplicationService#setup() must be invoked before start.');
    }

    this.registrationClosed = true;
    const { capabilities } = await this.capabilities.start({
      appIds: [...this.mounters.keys()],
      http,
    });
    const availableMounters = filterAvailable(this.mounters, capabilities);

    const enabledApps = filterAvailable(this.apps, capabilities);
    const availableApps$ = new BehaviorSubject(enabledApps);

    combineLatest([
      of(enabledApps),
      this.statusUpdaters$.pipe(map(statusUpdaters => [...statusUpdaters.values()])),
    ])
      .pipe(
        map(([apps, statusUpdaters]) => {
          return new Map([...apps].map(([id, app]) => [id, updateStatus(app, statusUpdaters)]));
        })
      )
      .subscribe(apps => availableApps$.next(apps));

    return {
      availableApps$,
      capabilities,
      currentAppId$: this.currentAppId$.pipe(takeUntil(this.stop$)),
      registerMountContext: this.mountContext.registerContext,
      getUrlForApp: (appId, { path }: { path?: string } = {}) =>
        getAppUrl(availableMounters, appId, path),
      navigateToApp: (appId, { path, state }: { path?: string; state?: any } = {}) => {
        const app = availableApps$.value.get(appId);
        if (app && app.status !== AppStatus.accessible) {
          // should probably redirect to the error page instead
          throw new Error(`Trying to navigate to an inaccessible application: ${appId}`);
        }
        this.navigate!(getAppUrl(availableMounters, appId, path), state);
        this.currentAppId$.next(appId);
      },
      getComponent: () =>
        this.history ? <AppRouter history={this.history} mounters={availableMounters} /> : null,
    };
  }

  public stop() {
    this.stop$.next();
    this.currentAppId$.complete();
    this.statusUpdaters$.complete();
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}

const updateStatus = <T extends AppBase>(app: T, statusUpdaters: AppUpdaterWrapper[]): T => {
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
        navLinkStatus: Math.max(changes.navLinkStatus || 0, fields.navLinkStatus || 0),
      };
    }
  });
  return {
    ...app,
    ...changes,
  };
};
