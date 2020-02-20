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
import { BehaviorSubject, Observable, Subject, Subscription } from 'rxjs';
import { map, shareReplay, takeUntil, distinctUntilChanged, filter } from 'rxjs/operators';
import { createBrowserHistory, History } from 'history';

import { InjectedMetadataSetup } from '../injected_metadata';
import { HttpSetup, HttpStart } from '../http';
import { OverlayStart } from '../overlays';
import { ContextSetup, IContextContainer } from '../context';
import { AppRouter } from './ui';
import { Capabilities, CapabilitiesService } from './capabilities';
import {
  App,
  AppBase,
  AppLeaveHandler,
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
import { getLeaveAction, isConfirmAction } from './application_leave';

interface SetupDeps {
  context: ContextSetup;
  http: HttpSetup;
  injectedMetadata: InjectedMetadataSetup;
  history?: History<any>;
  /**
   * Only necessary for redirecting to legacy apps
   * @deprecated
   */
  redirectTo?: (path: string) => void;
}

interface StartDeps {
  http: HttpStart;
  overlays: OverlayStart;
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
  private readonly appLeaveHandlers = new Map<string, AppLeaveHandler>();
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
    history,
  }: SetupDeps): InternalApplicationSetup {
    const basename = basePath.get();
    if (injectedMetadata.getLegacyMode()) {
      this.currentAppId$.next(injectedMetadata.getLegacyMetadata().app.id);
    } else {
      // Only setup history if we're not in legacy mode
      this.history = history || createBrowserHistory({ basename });
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
          status: app.status ?? AppStatus.accessible,
          navLinkStatus: app.navLinkStatus ?? AppNavLinkStatus.default,
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
          status: app.status ?? AppStatus.accessible,
          navLinkStatus: app.navLinkStatus ?? AppNavLinkStatus.default,
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

  public async start({ http, overlays }: StartDeps): Promise<InternalApplicationStart> {
    if (!this.mountContext) {
      throw new Error('ApplicationService#setup() must be invoked before start.');
    }

    this.registrationClosed = true;
    window.addEventListener('beforeunload', this.onBeforeUnload);

    const { capabilities } = await this.capabilities.start({
      appIds: [...this.mounters.keys()],
      http,
    });
    const availableMounters = filterAvailable(this.mounters, capabilities);
    const availableApps = filterAvailable(this.apps, capabilities);

    const applications$ = new BehaviorSubject(availableApps);
    this.statusUpdaters$
      .pipe(
        map(statusUpdaters => {
          return new Map(
            [...availableApps].map(([id, app]) => [
              id,
              updateStatus(app, [...statusUpdaters.values()]),
            ])
          );
        })
      )
      .subscribe(apps => applications$.next(apps));

    const applicationStatuses$ = applications$.pipe(
      map(apps => new Map([...apps.entries()].map(([id, app]) => [id, app.status!]))),
      shareReplay(1)
    );

    return {
      applications$,
      capabilities,
      currentAppId$: this.currentAppId$.pipe(
        filter(appId => appId !== undefined),
        distinctUntilChanged(),
        takeUntil(this.stop$)
      ),
      registerMountContext: this.mountContext.registerContext,
      getUrlForApp: (
        appId,
        { path, absolute = false }: { path?: string; absolute?: boolean } = {}
      ) => {
        const relUrl = http.basePath.prepend(getAppUrl(availableMounters, appId, path));
        return absolute ? relativeToAbsolute(relUrl) : relUrl;
      },
      navigateToApp: async (appId, { path, state }: { path?: string; state?: any } = {}) => {
        if (await this.shouldNavigate(overlays)) {
          this.appLeaveHandlers.delete(this.currentAppId$.value!);
          this.navigate!(getAppUrl(availableMounters, appId, path), state);
          this.currentAppId$.next(appId);
        }
      },
      getComponent: () => {
        if (!this.history) {
          return null;
        }
        return (
          <AppRouter
            history={this.history}
            mounters={availableMounters}
            appStatuses$={applicationStatuses$}
            setAppLeaveHandler={this.setAppLeaveHandler}
          />
        );
      },
    };
  }

  private setAppLeaveHandler = (appId: string, handler: AppLeaveHandler) => {
    this.appLeaveHandlers.set(appId, handler);
  };

  private async shouldNavigate(overlays: OverlayStart): Promise<boolean> {
    const currentAppId = this.currentAppId$.value;
    if (currentAppId === undefined) {
      return true;
    }
    const action = getLeaveAction(this.appLeaveHandlers.get(currentAppId));
    if (isConfirmAction(action)) {
      const confirmed = await overlays.openConfirm(action.text, {
        title: action.title,
        'data-test-subj': 'appLeaveConfirmModal',
      });
      if (!confirmed) {
        return false;
      }
    }
    return true;
  }

  private onBeforeUnload = (event: Event) => {
    const currentAppId = this.currentAppId$.value;
    if (currentAppId === undefined) {
      return;
    }
    const action = getLeaveAction(this.appLeaveHandlers.get(currentAppId));
    if (isConfirmAction(action)) {
      event.preventDefault();
      // some browsers accept a string return value being the message displayed
      event.returnValue = action.text as any;
    }
  };

  public stop() {
    this.stop$.next();
    this.currentAppId$.complete();
    this.statusUpdaters$.complete();
    this.subscriptions.forEach(sub => sub.unsubscribe());
    window.removeEventListener('beforeunload', this.onBeforeUnload);
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
        // status and navLinkStatus enums are ordered by reversed priority
        // if multiple updaters wants to change these fields, we will always follow the priority order.
        status: Math.max(changes.status ?? 0, fields.status ?? 0),
        navLinkStatus: Math.max(changes.navLinkStatus ?? 0, fields.navLinkStatus ?? 0),
      };
    }
  });
  return {
    ...app,
    ...changes,
  };
};

function relativeToAbsolute(url: string) {
  // convert all link urls to absolute urls
  const a = document.createElement('a');
  a.setAttribute('href', url);
  return a.href;
}
