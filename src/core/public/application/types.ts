/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { ButtonColor } from '@elastic/eui';
import { Observable } from 'rxjs';
import { History } from 'history';
import { RecursiveReadonly } from '@kbn/utility-types';

import { MountPoint } from '../types';
import { CoreTheme } from '../theme';
import { Capabilities } from './capabilities';
import { PluginOpaqueId } from '../plugins';
import { AppCategory } from '../../types';
import { ScopedHistory } from './scoped_history';

/**
 * Accessibility status of an application.
 *
 * @public
 */
export enum AppStatus {
  /**
   * Application is accessible.
   */
  accessible = 0,
  /**
   * Application is not accessible.
   */
  inaccessible = 1,
}

/**
 * Status of the application's navLink.
 *
 * @public
 */
export enum AppNavLinkStatus {
  /**
   * The application navLink will be `visible` if the application's {@link AppStatus} is set to `accessible`
   * and `hidden` if the application status is set to `inaccessible`.
   */
  default = 0,
  /**
   * The application navLink is visible and clickable in the navigation bar.
   */
  visible = 1,
  /**
   * The application navLink is visible but inactive and not clickable in the navigation bar.
   */
  disabled = 2,
  /**
   * The application navLink does not appear in the navigation bar.
   */
  hidden = 3,
}

/**
 * Defines the list of fields that can be updated via an {@link AppUpdater}.
 * @public
 */
export type AppUpdatableFields = Pick<
  App,
  'status' | 'navLinkStatus' | 'searchable' | 'tooltip' | 'defaultPath' | 'deepLinks'
>;

/**
 * App navigation menu options
 * @public
 */
export interface AppNavOptions {
  /**
   * An ordinal used to sort nav links relative to one another for display.
   */
  order?: number;

  /**
   * A tooltip shown when hovering over app link.
   */
  tooltip?: string;

  /**
   * A EUI iconType that will be used for the app's icon. This icon
   * takes precedence over the `icon` property.
   */
  euiIconType?: string;

  /**
   * A URL to an image file used as an icon. Used as a fallback
   * if `euiIconType` is not provided.
   */
  icon?: string;
}

/**
 * Updater for applications.
 * see {@link ApplicationSetup}
 * @public
 */
export type AppUpdater = (app: App) => Partial<AppUpdatableFields> | undefined;

/**
 * @public
 */
export interface App<HistoryLocationState = unknown> extends AppNavOptions {
  /**
   * The unique identifier of the application
   */
  id: string;

  /**
   * The title of the application.
   */
  title: string;

  /**
   * The category definition of the product
   * See {@link AppCategory}
   * See DEFAULT_APP_CATEGORIES for more reference
   */
  category?: AppCategory;

  /**
   * The initial status of the application.
   * Defaulting to `accessible`
   */
  status?: AppStatus;

  /**
   * The initial status of the application's navLink.
   * Defaulting to `visible` if `status` is `accessible` and `hidden` if status is `inaccessible`
   * See {@link AppNavLinkStatus}
   */
  navLinkStatus?: AppNavLinkStatus;

  /**
   * The initial flag to determine if the application is searchable in the global search.
   * Defaulting to `true` if `navLinkStatus` is `visible` or omitted.
   */
  searchable?: boolean;

  /**
   * Allow to define the default path a user should be directed to when navigating to the app.
   * When defined, this value will be used as a default for the `path` option when calling {@link ApplicationStart.navigateToApp | navigateToApp}`,
   * and will also be appended to the {@link ChromeNavLink | application navLink} in the navigation bar.
   */
  defaultPath?: string;

  /**
   * An {@link AppUpdater} observable that can be used to update the application {@link AppUpdatableFields} at runtime.
   *
   * @example
   *
   * How to update an application navLink at runtime
   *
   * ```ts
   * // inside your plugin's setup function
   * export class MyPlugin implements Plugin {
   *   private appUpdater = new BehaviorSubject<AppUpdater>(() => ({}));
   *
   *   setup({ application }) {
   *     application.register({
   *       id: 'my-app',
   *       title: 'My App',
   *       updater$: this.appUpdater,
   *       async mount(params) {
   *         const { renderApp } = await import('./application');
   *         return renderApp(params);
   *       },
   *     });
   *   }
   *
   *   start() {
   *      // later, when the navlink needs to be updated
   *      appUpdater.next(() => {
   *        navLinkStatus: AppNavLinkStatus.disabled,
   *      })
   *   }
   * ```
   */
  updater$?: Observable<AppUpdater>;

  /**
   * Custom capabilities defined by the app.
   */
  capabilities?: Partial<Capabilities>;

  /**
   * Hide the UI chrome when the application is mounted. Defaults to `false`.
   * Takes precedence over chrome service visibility settings.
   */
  chromeless?: boolean;

  /**
   * A mount function called when the user navigates to this app's route.
   */
  mount: AppMount<HistoryLocationState>;

  /**
   * Override the application's routing path from `/app/${id}`.
   * Must be unique across registered applications. Should not include the
   * base path from HTTP.
   */
  appRoute?: string;

  /**
   * If set to true, the application's route will only be checked against an exact match. Defaults to `false`.
   *
   * @example
   * ```ts
   * core.application.register({
   *   id: 'my_app',
   *   title: 'My App',
   *   exactRoute: true,
   *   mount: () => { ... },
   * })
   *
   * // '[basePath]/app/my_app' will be matched
   * // '[basePath]/app/my_app/some/path' will not be matched
   * ```
   */
  exactRoute?: boolean;

  /** Optional keywords to match with in deep links search. Omit if this part of the hierarchy does not have a page URL. */
  keywords?: string[];

  /**
   * Input type for registering secondary in-app locations for an application.
   *
   * Deep links must include at least one of `path` or `deepLinks`. A deep link that does not have a `path`
   * represents a topological level in the application's hierarchy, but does not have a destination URL that is
   * user-accessible.
   *
   * @example
   * ```ts
   * core.application.register({
   *   id: 'my_app',
   *   title: 'Translated title',
   *   keywords: ['translated keyword1', 'translated keyword2'],
   *   deepLinks: [
   *     {
   *       id: 'sub1',
   *       title: 'Sub1',
   *       path: '/sub1',
   *       keywords: ['subpath1'],
   *     },
   *     {
   *       id: 'sub2',
   *       title: 'Sub2',
   *       deepLinks: [
   *         {
   *           id: 'subsub',
   *           title: 'SubSub',
   *           path: '/sub2/sub',
   *           keywords: ['subpath2'],
   *         },
   *       ],
   *     },
   *   ],
   *   mount: () => { ... }
   * })
   * ```
   */
  deepLinks?: AppDeepLink[];
}

/**
 * Public information about a registered app's {@link AppDeepLink | deepLinks}
 *
 * @public
 */
export type PublicAppDeepLinkInfo = Omit<
  AppDeepLink,
  'deepLinks' | 'keywords' | 'navLinkStatus' | 'searchable'
> & {
  deepLinks: PublicAppDeepLinkInfo[];
  keywords: string[];
  navLinkStatus: AppNavLinkStatus;
  searchable: boolean;
};

/**
 * Input type for registering secondary in-app locations for an application.
 *
 * Deep links must include at least one of `path` or `deepLinks`. A deep link that does not have a `path`
 * represents a topological level in the application's hierarchy, but does not have a destination URL that is
 * user-accessible.
 * @public
 */
export type AppDeepLink = {
  /** Identifier to represent this sublink, should be unique for this application */
  id: string;
  /** Title to label represent this deep link */
  title: string;
  /** Optional keywords to match with in deep links search. Omit if this part of the hierarchy does not have a page URL. */
  keywords?: string[];
  /** Optional status of the chrome navigation, defaults to `hidden` */
  navLinkStatus?: AppNavLinkStatus;
  /** Optional flag to determine if the link is searchable in the global search. Defaulting to `true` if `navLinkStatus` is `visible` or omitted */
  searchable?: boolean;
} & AppNavOptions &
  (
    | {
        /** URL path to access this link, relative to the application's appRoute. */
        path: string;
        /** Optional array of links that are 'underneath' this section in the hierarchy */
        deepLinks?: AppDeepLink[];
      }
    | {
        /** Optional path to access this section. Omit if this part of the hierarchy does not have a page URL. */
        path?: string;
        /** Array links that are 'underneath' this section in this hierarchy. */
        deepLinks: AppDeepLink[];
      }
  );

/**
 * Public information about a registered {@link App | application}
 *
 * @public
 */
export type PublicAppInfo = Omit<
  App,
  'mount' | 'updater$' | 'keywords' | 'deepLinks' | 'searchable'
> & {
  // remove optional on fields populated with default values
  status: AppStatus;
  navLinkStatus: AppNavLinkStatus;
  appRoute: string;
  keywords: string[];
  deepLinks: PublicAppDeepLinkInfo[];
  searchable: boolean;
};

/**
 * A mount function called when the user navigates to this app's route.
 *
 * @param params {@link AppMountParameters}
 * @returns An unmounting function that will be called to unmount the application. See {@link AppUnmount}.
 *
 * @public
 */
export type AppMount<HistoryLocationState = unknown> = (
  params: AppMountParameters<HistoryLocationState>
) => AppUnmount | Promise<AppUnmount>;

/**
 * A function called when an application should be unmounted from the page. This function should be synchronous.
 * @public
 */
export type AppUnmount = () => void;

/** @public */
export interface AppMountParameters<HistoryLocationState = unknown> {
  /**
   * The container element to render the application into.
   */
  element: HTMLElement;

  /**
   * A scoped history instance for your application. Should be used to wire up
   * your applications Router.
   *
   * @example
   * How to configure react-router with a base path:
   *
   * ```ts
   * // inside your plugin's setup function
   * export class MyPlugin implements Plugin {
   *   setup({ application }) {
   *     application.register({
   *      id: 'my-app',
   *      appRoute: '/my-app',
   *      async mount(params) {
   *        const { renderApp } = await import('./application');
   *        return renderApp(params);
   *      },
   *    });
   *  }
   * }
   * ```
   *
   * ```ts
   * // application.tsx
   * import React from 'react';
   * import ReactDOM from 'react-dom';
   * import { Router, Route } from 'react-router-dom';
   *
   * import { CoreStart, AppMountParameters } from 'src/core/public';
   * import { MyPluginDepsStart } from './plugin';
   *
   * export renderApp = ({ element, history }: AppMountParameters) => {
   *   ReactDOM.render(
   *     <Router history={history}>
   *       <Route path="/" exact component={HomePage} />
   *     </Router>,
   *     element
   *   );
   *
   *   return () => ReactDOM.unmountComponentAtNode(element);
   * }
   * ```
   */
  history: ScopedHistory<HistoryLocationState>;

  /**
   * The route path for configuring navigation to the application.
   * This string should not include the base path from HTTP.
   *
   * @deprecated Use {@link AppMountParameters.history} instead.
   * @removeBy 8.8.0
   *
   * @example
   *
   * How to configure react-router with a base path:
   *
   * ```ts
   * // inside your plugin's setup function
   * export class MyPlugin implements Plugin {
   *   setup({ application }) {
   *     application.register({
   *      id: 'my-app',
   *      appRoute: '/my-app',
   *      async mount(params) {
   *        const { renderApp } = await import('./application');
   *        return renderApp(params);
   *      },
   *    });
   *  }
   * }
   * ```
   *
   * ```ts
   * // application.tsx
   * import React from 'react';
   * import ReactDOM from 'react-dom';
   * import { BrowserRouter, Route } from 'react-router-dom';
   *
   * import { CoreStart, AppMountParameters } from 'src/core/public';
   * import { MyPluginDepsStart } from './plugin';
   *
   * export renderApp = ({ appBasePath, element }: AppMountParameters) => {
   *   ReactDOM.render(
   *     // pass `appBasePath` to `basename`
   *     <BrowserRouter basename={appBasePath}>
   *       <Route path="/" exact component={HomePage} />
   *     </BrowserRouter>,
   *     element
   *   );
   *
   *   return () => ReactDOM.unmountComponentAtNode(element);
   * }
   * ```
   */
  appBasePath: string;

  /**
   * A function that can be used to register a handler that will be called
   * when the user is leaving the current application, allowing to
   * prompt a confirmation message before actually changing the page.
   *
   * This will be called either when the user goes to another application, or when
   * trying to close the tab or manually changing the url.
   *
   * @example
   *
   * ```ts
   * // application.tsx
   * import React from 'react';
   * import ReactDOM from 'react-dom';
   * import { BrowserRouter, Route } from 'react-router-dom';
   *
   * import { CoreStart, AppMountParameters } from 'src/core/public';
   * import { MyPluginDepsStart } from './plugin';
   *
   * export renderApp = ({ element, history, onAppLeave }: AppMountParameters) => {
   *    const { renderApp, hasUnsavedChanges } = await import('./application');
   *    onAppLeave(actions => {
   *      if(hasUnsavedChanges()) {
   *        return actions.confirm('Some changes were not saved. Are you sure you want to leave?');
   *      }
   *      return actions.default();
   *    });
   *    return renderApp({ element, history });
   * }
   * ```
   *
   * @deprecated {@link ScopedHistory.block} should be used instead.
   * @removeBy 8.8.0
   */
  onAppLeave: (handler: AppLeaveHandler) => void;

  /**
   * A function that can be used to set the mount point used to populate the application action container
   * in the chrome header.
   *
   * Calling the handler multiple time will erase the current content of the action menu with the mount from the latest call.
   * Calling the handler with `undefined` will unmount the current mount point.
   * Calling the handler after the application has been unmounted will have no effect.
   *
   * @example
   *
   * ```ts
   * // application.tsx
   * import React from 'react';
   * import ReactDOM from 'react-dom';
   * import { BrowserRouter, Route } from 'react-router-dom';
   *
   * import { CoreStart, AppMountParameters } from 'src/core/public';
   * import { MyPluginDepsStart } from './plugin';
   *
   * export renderApp = ({ element, history, setHeaderActionMenu }: AppMountParameters) => {
   *    const { renderApp } = await import('./application');
   *    const { renderActionMenu } = await import('./action_menu');
   *    setHeaderActionMenu((element) => {
   *      return renderActionMenu(element);
   *    })
   *    return renderApp({ element, history });
   * }
   * ```
   */
  setHeaderActionMenu: (menuMount: MountPoint | undefined) => void;

  /**
   * An observable emitting {@link CoreTheme | Core's theme}.
   * Should be used when mounting the application to include theme information.
   *
   * @example
   * When mounting a react application:
   * ```ts
   * // application.tsx
   * import React from 'react';
   * import ReactDOM from 'react-dom';
   *
   * import { AppMountParameters } from 'src/core/public';
   * import { wrapWithTheme } from 'src/plugins/kibana_react';
   * import { MyApp } from './app';
   *
   * export renderApp = ({ element, theme$ }: AppMountParameters) => {
   *    ReactDOM.render(wrapWithTheme(<MyApp/>, theme$), element);
   *    return () => ReactDOM.unmountComponentAtNode(element);
   * }
   * ```
   */
  theme$: Observable<CoreTheme>;
}

/**
 * A handler that will be executed before leaving the application, either when
 * going to another application or when closing the browser tab or manually changing
 * the url.
 * Should return `confirm` to prompt a message to the user before leaving the page, or `default`
 * to keep the default behavior (doing nothing).
 *
 * See {@link AppMountParameters} for detailed usage examples.
 *
 * @public
 * @deprecated {@link AppMountParameters.onAppLeave} has been deprecated in favor of {@link ScopedHistory.block}
 * @removeBy 8.8.0
 */
export type AppLeaveHandler = (
  factory: AppLeaveActionFactory,
  nextAppId?: string
) => AppLeaveAction;

/**
 * Possible type of actions on application leave.
 *
 * @public
 */
export enum AppLeaveActionType {
  confirm = 'confirm',
  default = 'default',
}

/**
 * Action to return from a {@link AppLeaveHandler} to execute the default
 * behaviour when leaving the application.
 *
 * See {@link AppLeaveActionFactory}
 *
 * @public
 */
export interface AppLeaveDefaultAction {
  type: AppLeaveActionType.default;
}

/**
 * Action to return from a {@link AppLeaveHandler} to show a confirmation
 * message when trying to leave an application.
 *
 * See {@link AppLeaveActionFactory}
 *
 * @public
 */
export interface AppLeaveConfirmAction {
  type: AppLeaveActionType.confirm;
  text: string;
  title?: string;
  confirmButtonText?: string;
  buttonColor?: ButtonColor;
  callback?: () => void;
}

/**
 * Possible actions to return from a {@link AppLeaveHandler}
 *
 * See {@link AppLeaveConfirmAction} and {@link AppLeaveDefaultAction}
 *
 * @public
 * */
export type AppLeaveAction = AppLeaveDefaultAction | AppLeaveConfirmAction;

/**
 * Factory provided when invoking a {@link AppLeaveHandler} to retrieve the {@link AppLeaveAction} to execute.
 */
export interface AppLeaveActionFactory {
  /**
   * Returns a confirm action, resulting on prompting a message to the user before leaving the
   * application, allowing him to choose if he wants to stay on the app or confirm that he
   * wants to leave.
   *
   * @param text The text to display in the confirmation message
   * @param title (optional) title to display in the confirmation message
   * @param callback (optional) to know that the user want to stay on the page
   * @param confirmButtonText (optional) text for the confirmation button
   * @param buttonColor (optional) color for the confirmation button
   * so we can show to the user the right UX for him to saved his/her/their changes
   */
  confirm(
    text: string,
    title?: string,
    callback?: () => void,
    confirmButtonText?: string,
    buttonColor?: ButtonColor
  ): AppLeaveConfirmAction;

  /**
   * Returns a default action, resulting on executing the default behavior when
   * the user tries to leave an application
   */
  default(): AppLeaveDefaultAction;
}

/** @internal */
export interface Mounter {
  appRoute: string;
  appBasePath: string;
  mount: AppMount;
  exactRoute: boolean;
  unmountBeforeMounting?: boolean;
}

/** @internal */
export interface ParsedAppUrl {
  app: string;
  path?: string;
}

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

/** @internal */
export interface InternalApplicationSetup extends Pick<ApplicationSetup, 'registerAppUpdater'> {
  /**
   * Register an mountable application to the system.
   * @param plugin - opaque ID of the plugin that registers this application
   * @param app
   */
  register<HistoryLocationState = unknown>(
    plugin: PluginOpaqueId,
    app: App<HistoryLocationState>
  ): void;
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

export interface NavigateToUrlOptions {
  /**
   * if true, will bypass the default onAppLeave behavior
   */
  skipAppLeave?: boolean;
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
   * Navigate to a given app
   *
   * @param appId
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
   * Otherwise, fallback to a full page reload to navigate to the url using `window.location.assign`
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
   */
  navigateToUrl(url: string, options?: NavigateToUrlOptions): Promise<void>;
  /**
   * Navigate to a given url
   *
   * The method removes the eventListener and assigns the window location to the url provided
   */
  navigateToUrlSkipUnload(url: string): void;
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
}

/** @internal */
export interface InternalApplicationStart extends ApplicationStart {
  // Internal APIs
  getComponent(): JSX.Element | null;

  /**
   * The potential action menu set by the currently mounted app.
   * Consumed by the chrome header.
   *
   * @internal
   */
  currentActionMenu$: Observable<MountPoint | undefined>;

  /**
   * The global history instance, exposed only to Core.
   * @internal
   */
  history: History<unknown>;
}
