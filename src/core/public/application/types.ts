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

import { Observable } from 'rxjs';
import { History } from 'history';
import { RecursiveReadonly } from '@kbn/utility-types';

import { MountPoint } from '../types';
import { Capabilities } from './capabilities';
import { ChromeStart } from '../chrome';
import { IContextProvider } from '../context';
import { DocLinksStart } from '../doc_links';
import { HttpStart } from '../http';
import { I18nStart } from '../i18n';
import { NotificationsStart } from '../notifications';
import { OverlayStart } from '../overlays';
import { PluginOpaqueId } from '../plugins';
import { IUiSettingsClient } from '../ui_settings';
import { SavedObjectsStart } from '../saved_objects';
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
  'status' | 'navLinkStatus' | 'tooltip' | 'defaultPath' | 'searchDeepLinks' | 'meta'
>;

/**
 * Updater for applications.
 * see {@link ApplicationSetup}
 * @public
 */
export type AppUpdater = (app: App) => Partial<AppUpdatableFields> | undefined;

/**
 * @public
 */
export interface App<HistoryLocationState = unknown> {
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
   * An ordinal used to sort nav links relative to one another for display.
   */
  order?: number;

  /**
   * A tooltip shown when hovering over app link.
   */
  tooltip?: string;

  /**
   * A EUI iconType that will be used for the app's icon. This icon
   * takes precendence over the `icon` property.
   */
  euiIconType?: string;

  /**
   * A URL to an image file used as an icon. Used as a fallback
   * if `euiIconType` is not provided.
   */
  icon?: string;

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
   * A mount function called when the user navigates to this app's route. May have signature of {@link AppMount} or
   * {@link AppMountDeprecated}.
   *
   * @remarks
   * When function has two arguments, it will be called with a {@link AppMountContext | context} as the first argument.
   * This behavior is **deprecated**, and consumers should instead use {@link CoreSetup.getStartServices}.
   */
  mount: AppMount<HistoryLocationState> | AppMountDeprecated<HistoryLocationState>;

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

  /**
   * Array of links that represent secondary in-app locations for the app.
   *
   * @remarks
   * Used to populate navigational search results (where available).
   * Can be updated using the {@link App.updater$} observable. See {@link AppSubLink} for more details.
   *
   * @example
   * The `path` property on deep links should not include the application's `appRoute`:
   * ```ts
   * core.application.register({
   *   id: 'my_app',
   *   title: 'My App',
   *   searchDeepLinks: [
   *     { id: 'sub1', title: 'Sub1', path: '/sub1', meta: { keywords: ['subpath1'] } },
   *     {
   *       id: 'sub2',
   *       title: 'Sub2',
   *       searchDeepLinks: [
   *         { id: 'subsub', title: 'SubSub', path: '/sub2/sub', meta: { keywords: ['subpath2'] } }
   *       ]
   *     }
   *   ],
   *   mount: () => { ... },
   * })
   * ```
   *
   * Will produce deep links on these paths:
   * - `/app/my_app/sub1`
   * - `/app/my_app/sub2/sub`
   */
  searchDeepLinks?: AppSearchDeepLink[];

  /**
   * Meta data for an application that represent additional information for the app.
   * See {@link AppMeta}
   *
   * @remarks
   * Used for global search results (where available).
   *
   * @example
   * ```ts
   * core.application.register({
   *   id: 'my_app',
   *   title: 'Translated title',
   *   meta: {
   *     keywords: ['tracing', 'distributed tracing']
   *   },
   *   mount: () => { ... }
   * })
   * ```
   */
  meta?: AppMeta;
}

/**
 * Input type for meta data for an application.
 *
 * Meta fields include at least `keywords`, an array of strings with which to associate the app.
 * Keywords must include at least one unique string as an array.
 * @public
 */
export interface AppMeta {
  /** Keywords to represent this application */
  keywords?: string[];
}

/**
 * Public information about a registered app's {@link AppMeta | keywords }
 *
 * @public
 */
export type PublicAppMetaInfo = Omit<AppMeta, 'keywords'> & {
  keywords: string[];
};
/**
 * Input type for registering secondary in-app locations for an application.
 *
 * Deep links must include at least one of `path` or `searchDeepLinks`. A deep link that does not have a `path`
 * represents a topological level in the application's hierarchy, but does not have a destination URL that is
 * user-accessible.
 * @public
 */
export type AppSearchDeepLink = {
  /** Identifier to represent this sublink, should be unique for this application */
  id: string;
  /** Title to label represent this deep link */
  title: string;
} & (
  | {
      /** URL path to access this link, relative to the application's appRoute. */
      path: string;
      /** Optional array of links that are 'underneath' this section in the hierarchy */
      searchDeepLinks?: AppSearchDeepLink[];
      /** Optional meta containing keywords to match with in deep links search */
      meta?: AppMeta;
    }
  | {
      /** Optional path to access this section. Omit if this part of the hierarchy does not have a page URL. */
      path?: string;
      /** Array links that are 'underneath' this section in this hierarchy. */
      searchDeepLinks: AppSearchDeepLink[];
      /** Meta containing keywords to match with in deep links search */
      meta?: AppMeta;
    }
);

/**
 * Public information about a registered app's {@link AppSearchDeepLink | searchDeepLinks}
 *
 * @public
 */
export type PublicAppSearchDeepLinkInfo = Omit<AppSearchDeepLink, 'searchDeepLinks' | 'meta'> & {
  searchDeepLinks: PublicAppSearchDeepLinkInfo[];
  meta: PublicAppMetaInfo;
};

/**
 * Public information about a registered {@link App | application}
 *
 * @public
 */
export type PublicAppInfo = Omit<App, 'mount' | 'updater$' | 'searchDeepLinks' | 'meta'> & {
  // remove optional on fields populated with default values
  status: AppStatus;
  navLinkStatus: AppNavLinkStatus;
  appRoute: string;
  searchDeepLinks: PublicAppSearchDeepLinkInfo[];
  meta: PublicAppMetaInfo;
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

/**
 * A mount function called when the user navigates to this app's route.
 *
 * @remarks
 * When function has two arguments, it will be called with a {@link AppMountContext | context} as the first argument.
 * This behavior is **deprecated**, and consumers should instead use {@link CoreSetup.getStartServices}.
 *
 * @param context The mount context for this app. Deprecated, use {@link CoreSetup.getStartServices}.
 * @param params {@link AppMountParameters}
 * @returns An unmounting function that will be called to unmount the application. See {@link AppUnmount}.
 *
 * @deprecated
 * @public
 */
export type AppMountDeprecated<HistoryLocationState = unknown> = (
  context: AppMountContext,
  params: AppMountParameters<HistoryLocationState>
) => AppUnmount | Promise<AppUnmount>;

/**
 * The context object received when applications are mounted to the DOM. Deprecated, use
 * {@link CoreSetup.getStartServices}.
 *
 * @deprecated
 * @public
 */
export interface AppMountContext {
  /**
   * Core service APIs available to mounted applications.
   */
  core: {
    /** {@link ApplicationStart} */
    application: Pick<ApplicationStart, 'capabilities' | 'navigateToApp'>;
    /** {@link ChromeStart} */
    chrome: ChromeStart;
    /** {@link DocLinksStart} */
    docLinks: DocLinksStart;
    /** {@link HttpStart} */
    http: HttpStart;
    /** {@link I18nStart} */
    i18n: I18nStart;
    /** {@link NotificationsStart} */
    notifications: NotificationsStart;
    /** {@link OverlayStart} */
    overlays: OverlayStart;
    /** {@link SavedObjectsStart} */
    savedObjects: SavedObjectsStart;
    /** {@link IUiSettingsClient} */
    uiSettings: IUiSettingsClient;
    /**
     * exposed temporarily until https://github.com/elastic/kibana/issues/41990 done
     * use *only* to retrieve config values. There is no way to set injected values
     * in the new platform. Use the legacy platform API instead.
     * @deprecated
     * */
    injectedMetadata: {
      getInjectedVar: (name: string, defaultValue?: any) => unknown;
    };
  };
}

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
}

/**
 * A handler that will be executed before leaving the application, either when
 * going to another application or when closing the browser tab or manually changing
 * the url.
 * Should return `confirm` to to prompt a message to the user before leaving the page, or `default`
 * to keep the default behavior (doing nothing).
 *
 * See {@link AppMountParameters} for detailed usage examples.
 *
 * @public
 */
export type AppLeaveHandler = (factory: AppLeaveActionFactory) => AppLeaveAction;

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
   */
  confirm(text: string, title?: string): AppLeaveConfirmAction;
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

  /**
   * Register a context provider for application mounting. Will only be available to applications that depend on the
   * plugin that registered this context. Deprecated, use {@link CoreSetup.getStartServices}.
   *
   * @deprecated
   * @param contextName - The key of {@link AppMountContext} this provider's return value should be attached to.
   * @param provider - A {@link IContextProvider} function
   */
  registerMountContext<T extends keyof AppMountContext>(
    contextName: T,
    provider: IContextProvider<AppMountDeprecated, T>
  ): void;
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

  /**
   * Register a context provider for application mounting. Will only be available to applications that depend on the
   * plugin that registered this context. Deprecated, use {@link CoreSetup.getStartServices}.
   *
   * @deprecated
   * @param pluginOpaqueId - The opaque ID of the plugin that is registering the context.
   * @param contextName - The key of {@link AppMountContext} this provider's return value should be attached to.
   * @param provider - A {@link IContextProvider} function
   */
  registerMountContext<T extends keyof AppMountContext>(
    pluginOpaqueId: PluginOpaqueId,
    contextName: T,
    provider: IContextProvider<AppMountDeprecated, T>
  ): void;
}

/**
 * Options for the {@link ApplicationStart.navigateToApp | navigateToApp API}
 */
export interface NavigateToAppOptions {
  /**
   * optional path inside application to deep link to.
   * If undefined, will use {@link App.defaultPath | the app's default path}` as default.
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
  navigateToUrl(url: string): Promise<void>;

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
  getUrlForApp(appId: string, options?: { path?: string; absolute?: boolean }): string;

  /**
   * Register a context provider for application mounting. Will only be available to applications that depend on the
   * plugin that registered this context. Deprecated, use {@link CoreSetup.getStartServices}.
   *
   * @deprecated
   * @param contextName - The key of {@link AppMountContext} this provider's return value should be attached to.
   * @param provider - A {@link IContextProvider} function
   */
  registerMountContext<T extends keyof AppMountContext>(
    contextName: T,
    provider: IContextProvider<AppMountDeprecated, T>
  ): void;

  /**
   * An observable that emits the current application id and each subsequent id update.
   */
  currentAppId$: Observable<string | undefined>;
}

/** @internal */
export interface InternalApplicationStart extends Omit<ApplicationStart, 'registerMountContext'> {
  /**
   * Register a context provider for application mounting. Will only be available to applications that depend on the
   * plugin that registered this context. Deprecated, use {@link CoreSetup.getStartServices}.
   *
   * @deprecated
   * @param pluginOpaqueId - The opaque ID of the plugin that is registering the context.
   * @param contextName - The key of {@link AppMountContext} this provider's return value should be attached to.
   * @param provider - A {@link IContextProvider} function
   */
  registerMountContext<T extends keyof AppMountContext>(
    pluginOpaqueId: PluginOpaqueId,
    contextName: T,
    provider: IContextProvider<AppMountDeprecated, T>
  ): void;

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
