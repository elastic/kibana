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
import { IUiSettingsClient } from '../ui_settings';
import { RecursiveReadonly } from '../../utils';
import { SavedObjectsStart } from '../saved_objects';

/** @public */
export interface AppBase {
  id: string;

  /**
   * The title of the application.
   */
  title: string;

  /**
   * An ordinal used to sort nav links relative to one another for display.
   */
  order?: number;

  /**
   * An observable for a tooltip shown when hovering over app link.
   */
  tooltip$?: Observable<string>;

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
}

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
}

/**
 * A function called when an application should be unmounted from the page. This function should be synchronous.
 * @public
 */
export type AppUnmount = () => void;

/** @public */
export interface ApplicationSetup {
  /**
   * Register an mountable application to the system.
   * @param app - an {@link App}
   */
  register(app: App): void;

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
export interface InternalApplicationSetup {
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
   * Apps available based on the current capabilities. Should be used
   * to show navigation links and make routing decisions.
   */
  availableApps: ReadonlyMap<string, App>;
  /**
   * Apps available based on the current capabilities. Should be used
   * to show navigation links and make routing decisions.
   * @internal
   */
  availableLegacyApps: ReadonlyMap<string, LegacyApp>;

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
  currentAppId$: Subject<string | undefined>;
  getComponent(): JSX.Element | null;
}
