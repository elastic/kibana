/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { BehaviorSubject, firstValueFrom, type Observable, Subject, type Subscription } from 'rxjs';
import { map, shareReplay, takeUntil, distinctUntilChanged, filter, take } from 'rxjs';
import { createBrowserHistory, History } from 'history';

import type { PluginOpaqueId } from '@kbn/core-base-common';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { InternalHttpSetup, InternalHttpStart } from '@kbn/core-http-browser-internal';
import type { Capabilities } from '@kbn/core-capabilities-common';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type {
  App,
  AppDeepLink,
  AppLeaveHandler,
  AppMount,
  AppUpdatableFields,
  AppUpdater,
  NavigateToAppOptions,
  NavigateToUrlOptions,
} from '@kbn/core-application-browser';
import { CapabilitiesService } from '@kbn/core-capabilities-browser-internal';
import { AppStatus } from '@kbn/core-application-browser';
import type { CustomBrandingStart } from '@kbn/core-custom-branding-browser';
import { AppRouter } from './ui';
import type { InternalApplicationSetup, InternalApplicationStart, Mounter } from './types';

import { getLeaveAction, isConfirmAction } from './application_leave';
import { getUserConfirmationHandler } from './navigation_confirm';
import {
  appendAppPath,
  parseAppUrl,
  relativeToAbsolute,
  getAppInfo,
  getLocationObservable,
} from './utils';
import { registerAnalyticsContextProvider } from './register_analytics_context_provider';

export interface SetupDeps {
  http: InternalHttpSetup;
  analytics: AnalyticsServiceSetup;
  history?: History<any>;
  /** Used to redirect to external urls */
  redirectTo?: (path: string) => void;
}

export interface StartDeps {
  http: InternalHttpStart;
  analytics: AnalyticsServiceStart;
  theme: ThemeServiceStart;
  overlays: OverlayStart;
  customBranding: CustomBrandingStart;
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

const getAppDeepLinkPath = (app: App<any>, appId: string, deepLinkId: string) => {
  const flattenedLinks = flattenDeepLinks(app.deepLinks);
  return flattenedLinks[deepLinkId];
};

const applicationIdRegexp = /^[a-zA-Z0-9_:-]+$/;
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
  private stop$ = new Subject<void>();
  private registrationClosed = false;
  private history?: History<any>;
  private location$?: Observable<string>;
  private navigate?: (url: string, state: unknown, replace: boolean) => void;
  private openInNewTab?: (url: string) => void;
  private redirectTo?: (url: string) => void;
  private overlayStart$ = new Subject<OverlayStart>();
  private hasCustomBranding$: Observable<boolean> | undefined;

  public setup({
    http: { basePath },
    analytics,
    redirectTo = (path: string) => {
      window.location.assign(path);
    },
    history,
  }: SetupDeps): InternalApplicationSetup {
    const basename = basePath.get();
    this.history =
      history ||
      createBrowserHistory({
        basename,
        getUserConfirmation: getUserConfirmationHandler({
          overlayPromise: firstValueFrom(this.overlayStart$.pipe(take(1))),
        }),
      });

    this.location$ = getLocationObservable(window.location, this.history);
    registerAnalyticsContextProvider({
      analytics,
      location$: this.location$,
    });

    this.navigate = (url, state, replace) => {
      // basePath not needed here because `history` is configured with basename
      return replace ? this.history!.replace(url, state) : this.history!.push(url, state);
    };

    this.openInNewTab = (url) => {
      // window.open shares session information if base url is same
      return window.open(appendAppPath(basename, url), '_blank');
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
        const currentAppId = this.currentAppId$.value;
        if (currentAppId && currentAppId !== app.id) {
          this.appInternalStates.delete(currentAppId);
        }
        this.currentAppId$.next(app.id);
        return app.mount(params);
      };
    };

    const validateApp = (app: App<unknown>) => {
      if (this.registrationClosed) {
        throw new Error(`Applications cannot be registered after "setup"`);
      } else if (!applicationIdRegexp.test(app.id)) {
        throw new Error(
          `Invalid application id: it can only be composed of alphanum chars, '-' and '_'`
        );
      } else if (this.apps.has(app.id)) {
        throw new Error(`An application is already registered with the id "${app.id}"`);
      } else if (findMounter(this.mounters, app.appRoute)) {
        throw new Error(`An application is already registered with the appRoute "${app.appRoute}"`);
      } else if (basename && app.appRoute!.startsWith(`${basename}/`)) {
        throw new Error('Cannot register an application route that includes HTTP base path');
      }
    };

    return {
      register: (plugin, app: App<any>) => {
        app = { appRoute: `/app/${app.id}`, ...app };

        validateApp(app);

        const { updater$, ...appProps } = app;
        this.apps.set(app.id, {
          ...appProps,
          status: app.status ?? AppStatus.accessible,
          deepLinks: populateDeepLinkDefaults(appProps.deepLinks),
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

  public async start({
    analytics,
    http,
    overlays,
    theme,
    customBranding,
  }: StartDeps): Promise<InternalApplicationStart> {
    if (!this.redirectTo) {
      throw new Error('ApplicationService#setup() must be invoked before start.');
    }

    this.overlayStart$.next(overlays);
    this.hasCustomBranding$ = customBranding.hasCustomBranding$.pipe(takeUntil(this.stop$));
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
      {
        deepLinkId,
        path,
        state,
        replace = false,
        openInNewTab = false,
        skipAppLeave = false,
      }: NavigateToAppOptions = {}
    ) => {
      const currentAppId = this.currentAppId$.value;
      const navigatingToSameApp = currentAppId === appId;
      const shouldNavigate =
        navigatingToSameApp || skipAppLeave ? true : await this.shouldNavigate(overlays, appId);

      const targetApp = applications$.value.get(appId);

      if (shouldNavigate) {
        if (deepLinkId && targetApp) {
          const deepLinkPath = getAppDeepLinkPath(targetApp, appId, deepLinkId);
          if (deepLinkPath) {
            path = appendAppPath(deepLinkPath, path);
          }
        }
        if (path === undefined) {
          path = targetApp?.defaultPath;
        }
        if (openInNewTab) {
          this.openInNewTab!(getAppUrl(availableMounters, appId, path));
        } else {
          this.navigate!(getAppUrl(availableMounters, appId, path), state, replace);
        }
      }
    };

    this.currentAppId$.subscribe(() => this.refreshCurrentActionMenu());

    return {
      applications$: applications$.pipe(
        map((apps) => new Map([...apps.entries()].map(([id, app]) => [id, getAppInfo(app)]))),
        shareReplay(1)
      ),
      capabilities,
      currentLocation$: this.location$!.pipe(takeUntil(this.stop$)),
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
        {
          path,
          absolute = false,
          deepLinkId,
        }: { path?: string; absolute?: boolean; deepLinkId?: string } = {}
      ) => {
        const targetApp = applications$.value.get(appId);
        if (deepLinkId && targetApp) {
          const deepLinkPath = getAppDeepLinkPath(targetApp, appId, deepLinkId);
          if (deepLinkPath) {
            path = appendAppPath(deepLinkPath, path);
          }
        }

        const relUrl = http.basePath.prepend(getAppUrl(availableMounters, appId, path));
        return absolute ? relativeToAbsolute(relUrl) : relUrl;
      },
      navigateToApp,
      navigateToUrl: async (
        url: string,
        { skipAppLeave = false, forceRedirect = false, state }: NavigateToUrlOptions = {}
      ) => {
        const appInfo = parseAppUrl(url, http.basePath, this.apps);
        if ((forceRedirect || !appInfo) === true) {
          if (skipAppLeave) {
            window.removeEventListener('beforeunload', this.onBeforeUnload);
          }
          return this.redirectTo!(url);
        }
        if (appInfo) {
          return navigateToApp(appInfo.app, { path: appInfo.path, skipAppLeave, state });
        }
      },
      getComponent: () => {
        if (!this.history) {
          return null;
        }
        return (
          <AppRouter
            analytics={analytics}
            history={this.history}
            theme$={theme.theme$}
            mounters={availableMounters}
            appStatuses$={applicationStatuses$}
            setAppLeaveHandler={this.setAppLeaveHandler}
            setAppActionMenu={this.setAppActionMenu}
            setIsMounting={(isMounting) => httpLoadingCount$.next(isMounting ? 1 : 0)}
            hasCustomBranding$={this.hasCustomBranding$}
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
        confirmButtonText: action.confirmButtonText,
        buttonColor: action.buttonColor,
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
        status: Math.max(
          changes.status ?? AppStatus.accessible,
          fields.status ?? AppStatus.accessible
        ),
        ...(fields.deepLinks ? { deepLinks: populateDeepLinkDefaults(fields.deepLinks) } : {}),
      };
    }
  });

  return {
    ...app,
    ...changes,
  };
};

const populateDeepLinkDefaults = (deepLinks?: AppDeepLink[]): AppDeepLink[] => {
  if (!deepLinks) {
    return [];
  }
  return deepLinks.map((deepLink) => ({
    ...deepLink,
    visibleIn: deepLink.visibleIn ?? ['globalSearch'], // by default, deepLinks are only visible in global search.
    deepLinks: populateDeepLinkDefaults(deepLink.deepLinks),
  }));
};

const flattenDeepLinks = (deepLinks?: AppDeepLink[]): Record<string, string> => {
  if (!deepLinks) {
    return {};
  }
  return deepLinks.reduce((deepLinkPaths: Record<string, string>, deepLink) => {
    if (deepLink.path) deepLinkPaths[deepLink.id] = deepLink.path;
    return { ...deepLinkPaths, ...flattenDeepLinks(deepLink.deepLinks) };
  }, {});
};
