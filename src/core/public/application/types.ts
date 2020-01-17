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
import { RecursiveReadonly } from '../../utils';
import { SavedObjectsStart } from '../saved_objects';

/** @public */
export interface AppBase {
  /**
   * The unique identifier of the application
   */
  id: string;

  /**
   * The title of the application.
   */
  title: string;

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
   * Flag to keep track of legacy applications.
   * For internal use only. any value will be overridden when registering an App.
   *
   * @internal
   */
  legacy?: boolean;

  /**
   * Hide the UI chrome when the application is mounted. Defaults to `false`.
   * Takes precedence over chrome service visibility settings.
   */
  chromeless?: boolean;
}

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
export type AppUpdatableFields = Pick<AppBase, 'status' | 'navLinkStatus' | 'tooltip'>;

/**
 * Updater for applications.
 * see {@link ApplicationSetup}
 * @public
 */
export type AppUpdater = (app: AppBase) => Partial<AppUpdatableFields> | undefined;

/**
 * Extension of {@link AppBase | common app properties} with the mount function.
 * @public
 */
export interface App extends AppBase {
  /**
   * A mount function called when the user navigates to this app's route. May have signature of {@link AppMount} or
   * {@link AppMountDeprecated}.
   *
   * @remarks
   * When function has two arguments, it will be called with a {@link AppMountContext | context} as the first argument.
   * This behavior is **deprecated**, and consumers should instead use {@link CoreSetup.getStartServices}.
   */
  mount: AppMount | AppMountDeprecated;

  /**
   * Hide the UI chrome when the application is mounted. Defaults to `false`.
   * Takes precedence over chrome service visibility settings.
   */
  chromeless?: boolean;

  /**
   * Override the application's routing path from `/app/${id}`.
   * Must be unique across registered applications. Should not include the
   * base path from HTTP.
   */
  appRoute?: string;
}

/** @internal */
export interface LegacyApp extends AppBase {
  appUrl: string;
  subUrlBase?: string;
  linkToLastSubUrl?: boolean;
}

/**
 * A mount function called when the user navigates to this app's route.
 *
 * @param params {@link AppMountParameters}
 * @returns An unmounting function that will be called to unmount the application. See {@link AppUnmount}.
 *
 * @public
 */
export type AppMount = (params: AppMountParameters) => AppUnmount | Promise<AppUnmount>;

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
export type AppMountDeprecated = (
  context: AppMountContext,
  params: AppMountParameters
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
export interface AppMountParameters {
  /**
   * The container element to render the application into.
   */
  element: HTMLElement;

  /**
   * The route path for configuring navigation to the application.
   * This string should not include the base path from HTTP.
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
   * import { CoreStart, AppMountParams } from 'src/core/public';
   * import { MyPluginDepsStart } from './plugin';
   *
   * export renderApp = ({ appBasePath, element }: AppMountParams) => {
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
   * import { CoreStart, AppMountParams } from 'src/core/public';
   * import { MyPluginDepsStart } from './plugin';
   *
   * export renderApp = ({ appBasePath, element, onAppLeave }: AppMountParams) => {
   *    const { renderApp, hasUnsavedChanges } = await import('./application');
   *    onAppLeave(actions => {
   *      if(hasUnsavedChanges()) {
   *        return actions.confirm('Some changes were not saved. Are you sure you want to leave?');
   *      }
   *      return actions.default();
   *    });
   *    return renderApp(params);
   * }
   * ```
   */
  onAppLeave: (handler: AppLeaveHandler) => void;
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

/**
 * A function called when an application should be unmounted from the page. This function should be synchronous.
 * @public
 */
export type AppUnmount = () => void;

/** @internal */
export type AppMounter = (params: AppMountParameters) => Promise<AppUnmount>;

/** @internal */
export type LegacyAppMounter = (params: AppMountParameters) => void;

/** @internal */
export type Mounter<T = App | LegacyApp> = SelectivePartial<
  {
    appRoute: string;
    appBasePath: string;
    mount: T extends LegacyApp ? LegacyAppMounter : AppMounter;
    unmountBeforeMounting: T extends LegacyApp ? true : boolean;
  },
  T extends LegacyApp ? never : 'unmountBeforeMounting'
>;

/** @public */
export interface ApplicationSetup {
  /**
   * Register an mountable application to the system.
   * @param app - an {@link App}
   */
  register(app: App): void;

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
  register(plugin: PluginOpaqueId, app: App): void;

  /**
   * Register metadata about legacy applications. Legacy apps will not be mounted when navigated to.
   * @param app
   * @internal
   */
  registerLegacyApp(app: LegacyApp): void;

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

/** @public */
export interface ApplicationStart {
  /**
   * Gets the read-only capabilities.
   */
  capabilities: RecursiveReadonly<Capabilities>;

  /**
   * Navigate to a given app
   *
   * @param appId
   * @param options.path - optional path inside application to deep link to
   * @param options.state - optional state to forward to the application
   */
  navigateToApp(appId: string, options?: { path?: string; state?: any }): Promise<void>;

  /**
   * Returns a relative URL to a given app, including the global base path.
   * @param appId
   * @param options.path - optional path inside application to deep link to
   */
  getUrlForApp(appId: string, options?: { path?: string }): string;

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
    contextName: T,
    provider: IContextProvider<AppMountDeprecated, T>
  ): void;
}

/** @internal */
export interface InternalApplicationStart
  extends Pick<ApplicationStart, 'capabilities' | 'navigateToApp' | 'getUrlForApp'> {
  /**
   * Apps available based on the current capabilities.
   * Should be used to show navigation links and make routing decisions.
   * Applications manually disabled from the client-side using {@link AppUpdater}
   */
  applications$: Observable<ReadonlyMap<string, App | LegacyApp>>;

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
  currentAppId$: Observable<string | undefined>;
  getComponent(): JSX.Element | null;
}

/** @internal */
type SelectivePartial<T, K extends keyof T> = Partial<Pick<T, K>> &
  Required<Pick<T, Exclude<keyof T, K>>> extends infer U
  ? { [P in keyof U]: U[P] }
  : never;
