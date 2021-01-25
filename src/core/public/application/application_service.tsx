/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { BehaviorSubject, Observable, Subject, Subscription } from 'rxjs';
import { map, shareReplay, takeUntil, distinctUntilChanged, filter } from 'rxjs/operators';
import { createBrowserHistory, History } from 'history';

import { MountPoint } from '../types';
import { HttpSetup, HttpStart } from '../http';
import { OverlayStart } from '../overlays';
import { PluginOpaqueId } from '../plugins';
import { AppRouter } from './ui';
import { Capabilities, CapabilitiesService } from './capabilities';
import {
  App,
  AppLeaveHandler,
  AppMount,
  AppNavLinkStatus,
  AppStatus,
  AppUpdatableFields,
  AppUpdater,
  InternalApplicationSetup,
  InternalApplicationStart,
  Mounter,
  NavigateToAppOptions,
} from './types';
import { getLeaveAction, isConfirmAction } from './application_leave';
import { appendAppPath, parseAppUrl, relativeToAbsolute, getAppInfo } from './utils';

interface SetupDeps {
  http: HttpSetup;
  history?: History<any>;
  /** Used to redirect to external urls */
  redirectTo?: (path: string) => void;
}

interface StartDeps {
  http: HttpStart;
  overlays: OverlayStart;
}

function filterAvailable<T>(m: Map<string, T>, capabilities: Capabilities) {
  return new Map(
    [...m].filter(
      ([id]) => capabilities.navLinks[id] === undefined || capabilities.navLinks[id] === true
    )
  );
}
const findMounter = (mounters: Map<string, Mounter>, appRoute?: string) =>
  [...mounters].find(([, mounter]) => mounter.appRoute === appRoute);

const getAppUrl = (mounters: Map<string, Mounter>, appId: string, path: string = '') => {
  const appBasePath = mounters.get(appId)?.appRoute
    ? `/${mounters.get(appId)!.appRoute}`
    : `/app/${appId}`;
  return appendAppPath(appBasePath, path);
};

const allApplicationsFilter = '__ALL__';

interface AppUpdaterWrapper {
  application: string;
  updater: AppUpdater;
}

interface AppInternalState {
  leaveHandler?: AppLeaveHandler;
  actionMenu?: MountPoint;
}

/**
 * Service that is responsible for registering new applications.
 * @internal
 */
export class ApplicationService {
  private readonly apps = new Map<string, App<any>>();
  private readonly mounters = new Map<string, Mounter>();
  private readonly capabilities = new CapabilitiesService();
  private readonly appInternalStates = new Map<string, AppInternalState>();
  private currentAppId$ = new BehaviorSubject<string | undefined>(undefined);
  private currentActionMenu$ = new BehaviorSubject<MountPoint | undefined>(undefined);
  private readonly statusUpdaters$ = new BehaviorSubject<Map<symbol, AppUpdaterWrapper>>(new Map());
  private readonly subscriptions: Subscription[] = [];
  private stop$ = new Subject();
  private registrationClosed = false;
  private history?: History<any>;
  private navigate?: (url: string, state: unknown, replace: boolean) => void;
  private redirectTo?: (url: string) => void;

  public setup({
    http: { basePath },
    redirectTo = (path: string) => {
      window.location.assign(path);
    },
    history,
  }: SetupDeps): InternalApplicationSetup {
    const basename = basePath.get();
    this.history = history || createBrowserHistory({ basename });

    this.navigate = (url, state, replace) => {
      // basePath not needed here because `history` is configured with basename
      return replace ? this.history!.replace(url, state) : this.history!.push(url, state);
    };

    this.redirectTo = redirectTo;

    const registerStatusUpdater = (application: string, updater$: Observable<AppUpdater>) => {
      const updaterId = Symbol();
      const subscription = updater$.subscribe((updater) => {
        const nextValue = new Map(this.statusUpdaters$.getValue());
        nextValue.set(updaterId, {
          application,
          updater,
        });
        this.statusUpdaters$.next(nextValue);
      });
      this.subscriptions.push(subscription);
    };

    const wrapMount = (plugin: PluginOpaqueId, app: App<any>): AppMount => {
      return async (params) => {
        this.currentAppId$.next(app.id);
        return app.mount(params);
      };
    };

    return {
      register: (plugin, app: App<any>) => {
        app = { appRoute: `/app/${app.id}`, ...app };

        if (this.registrationClosed) {
          throw new Error(`Applications cannot be registered after "setup"`);
        } else if (this.apps.has(app.id)) {
          throw new Error(`An application is already registered with the id "${app.id}"`);
        } else if (findMounter(this.mounters, app.appRoute)) {
          throw new Error(
            `An application is already registered with the appRoute "${app.appRoute}"`
          );
        } else if (basename && app.appRoute!.startsWith(`${basename}/`)) {
          throw new Error('Cannot register an application route that includes HTTP base path');
        }

        const { updater$, ...appProps } = app;
        this.apps.set(app.id, {
          ...appProps,
          status: app.status ?? AppStatus.accessible,
          navLinkStatus: app.navLinkStatus ?? AppNavLinkStatus.default,
        });
        if (updater$) {
          registerStatusUpdater(app.id, updater$);
        }
        this.mounters.set(app.id, {
          appRoute: app.appRoute!,
          appBasePath: basePath.prepend(app.appRoute!),
          exactRoute: app.exactRoute ?? false,
          mount: wrapMount(plugin, app),
          unmountBeforeMounting: false,
        });
      },
      registerAppUpdater: (appUpdater$: Observable<AppUpdater>) =>
        registerStatusUpdater(allApplicationsFilter, appUpdater$),
    };
  }

  public async start({ http, overlays }: StartDeps): Promise<InternalApplicationStart> {
    if (!this.redirectTo) {
      throw new Error('ApplicationService#setup() must be invoked before start.');
    }

    const httpLoadingCount$ = new BehaviorSubject(0);
    http.addLoadingCountSource(httpLoadingCount$);

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
        map((statusUpdaters) => {
          return new Map(
            [...availableApps].map(([id, app]) => [
              id,
              updateStatus(app, [...statusUpdaters.values()]),
            ])
          );
        })
      )
      .subscribe((apps) => applications$.next(apps));

    const applicationStatuses$ = applications$.pipe(
      map((apps) => new Map([...apps.entries()].map(([id, app]) => [id, app.status!]))),
      shareReplay(1)
    );

    const navigateToApp: InternalApplicationStart['navigateToApp'] = async (
      appId,
      { path, state, replace = false }: NavigateToAppOptions = {}
    ) => {
      const currentAppId = this.currentAppId$.value;
      const navigatingToSameApp = currentAppId === appId;
      const shouldNavigate = navigatingToSameApp
        ? true
        : await this.shouldNavigate(overlays, appId);

      if (shouldNavigate) {
        if (path === undefined) {
          path = applications$.value.get(appId)?.defaultPath;
        }
        if (!navigatingToSameApp) {
          this.appInternalStates.delete(this.currentAppId$.value!);
        }
        this.navigate!(getAppUrl(availableMounters, appId, path), state, replace);
        this.currentAppId$.next(appId);
      }
    };

    this.currentAppId$.subscribe(() => this.refreshCurrentActionMenu());

    return {
      applications$: applications$.pipe(
        map((apps) => new Map([...apps.entries()].map(([id, app]) => [id, getAppInfo(app)]))),
        shareReplay(1)
      ),
      capabilities,
      currentAppId$: this.currentAppId$.pipe(
        filter((appId) => appId !== undefined),
        distinctUntilChanged(),
        takeUntil(this.stop$)
      ),
      currentActionMenu$: this.currentActionMenu$.pipe(
        distinctUntilChanged(),
        takeUntil(this.stop$)
      ),
      history: this.history!,
      getUrlForApp: (
        appId,
        { path, absolute = false }: { path?: string; absolute?: boolean } = {}
      ) => {
        const relUrl = http.basePath.prepend(getAppUrl(availableMounters, appId, path));
        return absolute ? relativeToAbsolute(relUrl) : relUrl;
      },
      navigateToApp,
      navigateToUrl: async (url) => {
        const appInfo = parseAppUrl(url, http.basePath, this.apps);
        if (appInfo) {
          return navigateToApp(appInfo.app, { path: appInfo.path });
        } else {
          return this.redirectTo!(url);
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
            setAppActionMenu={this.setAppActionMenu}
            setIsMounting={(isMounting) => httpLoadingCount$.next(isMounting ? 1 : 0)}
          />
        );
      },
    };
  }

  private setAppLeaveHandler = (appId: string, handler: AppLeaveHandler) => {
    this.appInternalStates.set(appId, {
      ...(this.appInternalStates.get(appId) ?? {}),
      leaveHandler: handler,
    });
  };

  private setAppActionMenu = (appId: string, mount: MountPoint | undefined) => {
    this.appInternalStates.set(appId, {
      ...(this.appInternalStates.get(appId) ?? {}),
      actionMenu: mount,
    });
    this.refreshCurrentActionMenu();
  };

  private refreshCurrentActionMenu = () => {
    const appId = this.currentAppId$.getValue();
    const currentActionMenu = appId ? this.appInternalStates.get(appId)?.actionMenu : undefined;
    this.currentActionMenu$.next(currentActionMenu);
  };

  private async shouldNavigate(overlays: OverlayStart, nextAppId: string): Promise<boolean> {
    const currentAppId = this.currentAppId$.value;
    if (currentAppId === undefined) {
      return true;
    }
    const action = getLeaveAction(
      this.appInternalStates.get(currentAppId)?.leaveHandler,
      nextAppId
    );
    if (isConfirmAction(action)) {
      const confirmed = await overlays.openConfirm(action.text, {
        title: action.title,
        'data-test-subj': 'appLeaveConfirmModal',
      });
      if (!confirmed) {
        if (action.callback) {
          setTimeout(action.callback, 0);
        }
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
    const action = getLeaveAction(this.appInternalStates.get(currentAppId)?.leaveHandler);
    if (isConfirmAction(action)) {
      event.preventDefault();
      // some browsers accept a string return value being the message displayed
      event.returnValue = action.text as any;
    }
  };

  public stop() {
    this.stop$.next();
    this.currentAppId$.complete();
    this.currentActionMenu$.complete();
    this.statusUpdaters$.complete();
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    window.removeEventListener('beforeunload', this.onBeforeUnload);
  }
}

const updateStatus = (app: App, statusUpdaters: AppUpdaterWrapper[]): App => {
  let changes: Partial<AppUpdatableFields> = {};
  statusUpdaters.forEach((wrapper) => {
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
