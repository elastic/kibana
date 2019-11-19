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

import { Observable, Subject } from 'rxjs';

import { Capabilities } from './capabilities';
import { ChromeStart } from '../chrome';
import { IContextProvider } from '../context';
import { DocLinksStart } from '../doc_links';
import { HttpStart } from '../http';
import { I18nStart } from '../i18n';
import { NotificationsStart } from '../notifications';
import { OverlayStart } from '../overlays';
import { PluginOpaqueId } from '../plugins';
import { UiSettingsClientContract } from '../ui_settings';
import { RecursiveReadonly } from '../../utils';

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
   * The status of the application.
   */
  status?: AppStatus;

  /**
   * An {@link AppStatusUpdater} observable that can be used to update
   * the application {@link AppUpdatableFields} at runtime.
   */
  statusUpdater$?: Observable<AppStatusUpdater>;

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
   * Application is not accessible, but visible in an inactive state in navigation.
   */
  inaccessibleWithDisabledNavLink = 1,
  /**
   * Application is not accessible.
   */
  inaccessible = 2,
}

/**
 * Defines the list of fields that can be updated via an {@link AppStatusUpdater}.
 * @public
 */
export type AppUpdatableFields = Pick<AppBase, 'status' | 'tooltip'>;

/**
 * Status updater for applications.
 * @public
 */
export type AppStatusUpdater = (app: AppBase) => Partial<AppUpdatableFields> | undefined;

/**
 * Extension of {@link AppBase | common app properties} with the mount function.
 * @public
 */
export interface App extends AppBase {
  /**
   * A mount function called when the user navigates to this app's route.
   * @param context The mount context for this app.
   * @param targetDomElement An HTMLElement to mount the application onto.
   * @returns An unmounting function that will be called to unmount the application.
   */
  mount: (context: AppMountContext, params: AppMountParameters) => AppUnmount | Promise<AppUnmount>;
}

/** @internal */
export interface LegacyApp extends AppBase {
  appUrl: string;
  subUrlBase?: string;
  linkToLastSubUrl?: boolean;
}

/**
 * The context object received when applications are mounted to the DOM.
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
    /** {@link UiSettingsClient} */
    uiSettings: UiSettingsClientContract;
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
   * The base path for configuring the application's router.
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
   *      async mount(context, params) {
   *        const { renderApp } = await import('./application');
   *        return renderApp(context, params);
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
   * export renderApp = (context, { appBasePath, element }) => {
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
}

/**
 * A function called when an application should be unmounted from the page. This function should be synchronous.
 * @public
 */
export type AppUnmount = () => void;

/** @internal */
export type AppMounter = (params: AppMountParameters) => Promise<AppUnmount>;

/** @public */
export interface ApplicationSetup {
  /**
   * Register an mountable application to the system.
   * @param app - an {@link App}
   */
  register(app: App): void;

  /**
   * Register an application status updater that can be used to change the {@link AppUpdatableFields} fields
   * of all applications at runtime.
   *
   * @param statusUpdater$
   */
  registerAppStatusUpdater(statusUpdater$: Observable<AppStatusUpdater>): void;

  /**
   * Register a context provider for application mounting. Will only be available to applications that depend on the
   * plugin that registered this context.
   *
   * @param contextName - The key of {@link AppMountContext} this provider's return value should be attached to.
   * @param provider - A {@link IContextProvider} function
   */
  registerMountContext<T extends keyof AppMountContext>(
    contextName: T,
    provider: IContextProvider<App['mount'], T>
  ): void;
}

/** @internal */
export interface InternalApplicationSetup {
  /**
   * Register an mountable application to the system.
   * @param plugin - opaque ID of the plugin that registers this application
   * @param app
   */
  register(plugin: PluginOpaqueId, app: App): void;

  /**
   * TODO
   * @param statusUpdater$
   */
  registerAppStatusUpdater(statusUpdater$: Observable<AppStatusUpdater>): void;

  /**
   * Register metadata about legacy applications. Legacy apps will not be mounted when navigated to.
   * @param app
   * @internal
   */
  registerLegacyApp(app: LegacyApp): void;

  /**
   * Register a context provider for application mounting. Will only be available to applications that depend on the
   * plugin that registered this context.
   *
   * @param pluginOpaqueId - The opaque ID of the plugin that is registering the context.
   * @param contextName - The key of {@link AppMountContext} this provider's return value should be attached to.
   * @param provider - A {@link IContextProvider} function
   */
  registerMountContext<T extends keyof AppMountContext>(
    pluginOpaqueId: PluginOpaqueId,
    contextName: T,
    provider: IContextProvider<App['mount'], T>
  ): void;
}

/** @public */
export interface ApplicationStart {
  /**
   * Gets the read-only capabilities.
   */
  capabilities: RecursiveReadonly<Capabilities>;

  /**
   * Navigiate to a given app
   *
   * @param appId
   * @param options.path - optional path inside application to deep link to
   * @param options.state - optional state to forward to the application
   */
  navigateToApp(appId: string, options?: { path?: string; state?: any }): void;

  /**
   * Returns a relative URL to a given app, including the global base path.
   * @param appId
   * @param options.path - optional path inside application to deep link to
   */
  getUrlForApp(appId: string, options?: { path?: string }): string;

  /**
   * Register a context provider for application mounting. Will only be available to applications that depend on the
   * plugin that registered this context.
   *
   * @param pluginOpaqueId - The opaque ID of the plugin that is registering the context.
   * @param contextName - The key of {@link AppMountContext} this provider's return value should be attached to.
   * @param provider - A {@link IContextProvider} function
   */
  registerMountContext<T extends keyof AppMountContext>(
    contextName: T,
    provider: IContextProvider<App['mount'], T>
  ): void;
}

/** @internal */
export interface InternalApplicationStart
  extends Pick<ApplicationStart, 'capabilities' | 'navigateToApp' | 'getUrlForApp'> {
  /**
   * Apps available based on the current capabilities. Should be used
   * to show navigation links and make routing decisions.
   */
  availableApps$: Observable<ReadonlyMap<string, App | LegacyApp>>;

  /**
   * Register a context provider for application mounting. Will only be available to applications that depend on the
   * plugin that registered this context.
   *
   * @param pluginOpaqueId - The opaque ID of the plugin that is registering the context.
   * @param contextName - The key of {@link AppMountContext} this provider's return value should be attached to.
   * @param provider - A {@link IContextProvider} function
   */
  registerMountContext<T extends keyof AppMountContext>(
    pluginOpaqueId: PluginOpaqueId,
    contextName: T,
    provider: IContextProvider<App['mount'], T>
  ): void;

  // Internal APIs
  currentAppId$: Subject<string | undefined>;
  getComponent(): JSX.Element | null;
}
