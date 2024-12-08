/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { RecursiveReadonly } from '@kbn/utility-types';
import type { Capabilities } from '@kbn/core-capabilities-common';
import type { App, AppUpdater, PublicAppInfo } from './application';

/** @public */
export interface ApplicationSetup {
  /**
   * Register an mountable application to the system.
   * @param app - an {@link App}
   * @typeParam HistoryLocationState - shape of the `History` state on {@link AppMountParameters.history}, defaults to `unknown`.
   */
  register<HistoryLocationState = unknown>(app: App<HistoryLocationState>): void;

  /**
   * Register an application updater that can be used to change the {@link AppUpdatableFields} fields
   * of all applications at runtime.
   *
   * This is meant to be used by plugins that needs to updates the whole list of applications.
   * To only updates a specific application, use the `updater$` property of the registered application instead.
   *
   * @example
   *
   * How to register an application updater that disables some applications:
   *
   * ```ts
   * // inside your plugin's setup function
   * export class MyPlugin implements Plugin {
   *   setup({ application }) {
   *     application.registerAppUpdater(
   *       new BehaviorSubject<AppUpdater>(app => {
   *          if (myPluginApi.shouldDisable(app))
   *            return {
   *              status: AppStatus.inaccessible,
   *            };
   *        })
   *      );
   *     }
   * }
   * ```
   */
  registerAppUpdater(appUpdater$: Observable<AppUpdater>): void;
}

/** @public */
export interface ApplicationStart {
  /**
   * Gets the read-only capabilities.
   */
  capabilities: RecursiveReadonly<Capabilities>;

  /**
   * Observable emitting the list of currently registered apps and their associated status.
   *
   * @remarks
   * Applications disabled by {@link Capabilities} will not be present in the map. Applications manually disabled from
   * the client-side using an {@link AppUpdater | application updater} are present, with their status properly set as `inaccessible`.
   */
  applications$: Observable<ReadonlyMap<string, PublicAppInfo>>;

  /**
   * Navigate to a given app.
   * If a plugin is disabled any applications it registers won't be available either.
   * Before rendering a UI element that a user could use to navigate to another application,
   * first check if the destination application is actually available using the isAppRegistered API.
   *
   * @param appId - The identifier of the app to navigate to
   * @param options - navigation options
   */
  navigateToApp(appId: string, options?: NavigateToAppOptions): Promise<void>;

  /**
   * Navigate to given URL in a SPA friendly way when possible (when the URL will redirect to a valid application
   * within the current basePath).
   *
   * The method resolves pathnames the same way browsers do when resolving a `<a href>` value. The provided `url` can be:
   * - an absolute URL
   * - an absolute path
   * - a path relative to the current URL (window.location.href)
   *
   * If all these criteria are true for the given URL:
   * - (only for absolute URLs) The origin of the URL matches the origin of the browser's current location
   * - The resolved pathname of the provided URL/path starts with the current basePath (eg. /mybasepath/s/my-space)
   * - The pathname segment after the basePath matches any known application route (eg. /app/<id>/ or any application's `appRoute` configuration)
   *
   * Then a SPA navigation will be performed using `navigateToApp` using the corresponding application and path.
   * Otherwise, fallback to a full page reload to navigate to the url using `window.location.assign`.
   *
   * @example
   * ```ts
   * // current url: `https://kibana:8080/base-path/s/my-space/app/dashboard`
   *
   * // will call `application.navigateToApp('discover', { path: '/some-path?foo=bar'})`
   * application.navigateToUrl('https://kibana:8080/base-path/s/my-space/app/discover/some-path?foo=bar')
   * application.navigateToUrl('/base-path/s/my-space/app/discover/some-path?foo=bar')
   * application.navigateToUrl('./discover/some-path?foo=bar')
   *
   * // will perform a full page reload using `window.location.assign`
   * application.navigateToUrl('https://elsewhere:8080/base-path/s/my-space/app/discover/some-path') // origin does not match
   * application.navigateToUrl('/app/discover/some-path') // does not include the current basePath
   * application.navigateToUrl('/base-path/s/my-space/app/unknown-app/some-path') // unknown application
   * application.navigateToUrl('../discover') // resolve to `/base-path/s/my-space/discover` which is not a path of a known app.
   * application.navigateToUrl('../../other-space/discover') // resolve to `/base-path/s/other-space/discover` which is not within the current basePath.
   * ```
   *
   * @param url - an absolute URL, an absolute path or a relative path, to navigate to.
   * @param options - navigation options
   */
  navigateToUrl(url: string, options?: NavigateToUrlOptions): Promise<void>;

  /**
   * Checks whether a given application is registered.
   *
   * @param appId - The identifier of the app to check
   * @returns true if the given appId is registered in the system, false otherwise.
   */
  isAppRegistered(appId: string): boolean;

  /**
   * Returns the absolute path (or URL) to a given app, including the global base path.
   *
   * By default, it returns the absolute path of the application (e.g `/basePath/app/my-app`).
   * Use the `absolute` option to generate an absolute url instead (e.g `http://host:port/basePath/app/my-app`)
   *
   * Note that when generating absolute urls, the origin (protocol, host and port) are determined from the browser's current location.
   *
   * @param appId
   * @param options.path - optional path inside application to deep link to
   * @param options.absolute - if true, will returns an absolute url instead of a relative one
   */
  getUrlForApp(
    appId: string,
    options?: { path?: string; absolute?: boolean; deepLinkId?: string }
  ): string;

  /**
   * An observable that emits the current application id and each subsequent id update.
   */
  currentAppId$: Observable<string | undefined>;

  /**
   * An observable that emits the current path#hash and each subsequent update using the global history instance
   */
  currentLocation$: Observable<string>;
}

/**
 * Options for the {@link ApplicationStart.navigateToApp | navigateToApp API}
 * @public
 */
export interface NavigateToAppOptions {
  /**
   * optional {@link App.deepLinks | deep link} id inside the application to navigate to.
   * If an additional {@link NavigateToAppOptions.path | path} is defined it will be appended to the deep link path.
   */
  deepLinkId?: string;
  /**
   * optional path inside application to deep link to.
   * If undefined, will use {@link App.defaultPath | the app's default path} as default.
   */
  path?: string;
  /**
   * optional state to forward to the application
   */
  state?: unknown;
  /**
   * if true, will not create a new history entry when navigating (using `replace` instead of `push`)
   */
  replace?: boolean;

  /**
   * if true, will open the app in new tab, will share session information via window.open if base
   */
  openInNewTab?: boolean;

  /**
   * if true, will bypass the default onAppLeave behavior
   */
  skipAppLeave?: boolean;
}

/**
 * Options for the {@link ApplicationStart.navigateToUrl | navigateToUrl API}
 * @public
 */
export interface NavigateToUrlOptions {
  /**
   * if true, will bypass the default onAppLeave behavior
   */
  skipAppLeave?: boolean;
  /**
   * if true will force a full page reload/refresh/assign, overriding the outcome of other url checks against current the location (effectively using `window.location.assign` instead of `push`)
   */
  forceRedirect?: boolean;
  /**
   * optional state to forward to the application
   */
  state?: unknown;
}
