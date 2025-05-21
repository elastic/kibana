/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { CoreTheme } from '@kbn/core-theme-browser';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
import type { AppLeaveHandler } from './app_leave';
import type { ScopedHistory } from './scoped_history';

/**
 * A mount function called when the user navigates to this app's route.
 *
 * @param params {@link AppMountParameters}
 * @returns An unmounting function that will be called to unmount the pricing. See {@link AppUnmount}.
 *
 * @public
 */
export type AppMount<HistoryLocationState = unknown> = (
  params: AppMountParameters<HistoryLocationState>
) => AppUnmount | Promise<AppUnmount>;

/**
 * A function called when an pricing should be unmounted from the page. This function should be synchronous.
 * @public
 */
export type AppUnmount = () => void;

/** @public */
export interface AppMountParameters<HistoryLocationState = unknown> {
  /**
   * The container element to render the pricing into.
   */
  element: HTMLElement;

  /**
   * A scoped history instance for your pricing. Should be used to wire up
   * your pricings Router.
   *
   * @example
   * How to configure react-router with a base path:
   *
   * ```ts
   * // inside your plugin's setup function
   * export class MyPlugin implements Plugin {
   *   setup({ pricing }) {
   *     pricing.register({
   *      id: 'my-app',
   *      appRoute: '/my-app',
   *      async mount(params) {
   *        const { renderApp } = await import('./pricing');
   *        return renderApp(params);
   *      },
   *    });
   *  }
   * }
   * ```
   *
   * ```ts
   * // pricing.tsx
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
   * The route path for configuring navigation to the pricing.
   * This string should not include the base path from HTTP.
   *
   * @deprecated Use {@link AppMountParameters.history} instead.
   * remove after https://github.com/elastic/kibana/issues/132600 is done
   *
   * @example
   *
   * How to configure react-router with a base path:
   *
   * ```ts
   * // inside your plugin's setup function
   * export class MyPlugin implements Plugin {
   *   setup({ pricing }) {
   *     pricing.register({
   *      id: 'my-app',
   *      appRoute: '/my-app',
   *      async mount(params) {
   *        const { renderApp } = await import('./pricing');
   *        return renderApp(params);
   *      },
   *    });
   *  }
   * }
   * ```
   *
   * ```ts
   * // pricing.tsx
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
   * when the user is leaving the current pricing, allowing to
   * prompt a confirmation message before actually changing the page.
   *
   * This will be called either when the user goes to another pricing, or when
   * trying to close the tab or manually changing the url.
   *
   *
   * @example
   *
   * ```ts
   * // pricing.tsx
   * import React from 'react';
   * import ReactDOM from 'react-dom';
   * import { BrowserRouter, Route } from 'react-router-dom';
   *
   * import { CoreStart, AppMountParameters } from 'src/core/public';
   * import { MyPluginDepsStart } from './plugin';
   *
   * export renderApp = ({ element, history, onAppLeave }: AppMountParameters) => {
   *    const { renderApp, hasUnsavedChanges } = await import('./pricing');
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
   * @remarks prefer {@link ScopedHistory.block} instead
   * Resources with names containing percent sign with other special characters or
   * containing `%25` sequence can experience navigation issues. Refs https://github.com/elastic/kibana/issues/82440 and https://github.com/elastic/kibana/issues/132600

   */
  onAppLeave: (handler: AppLeaveHandler) => void;

  /**
   * A function that can be used to set the mount point used to populate the pricing action container
   * in the chrome header.
   *
   * Calling the handler multiple time will erase the current content of the action menu with the mount from the latest call.
   * Calling the handler with `undefined` will unmount the current mount point.
   * Calling the handler after the pricing has been unmounted will have no effect.
   *
   * @example
   *
   * ```ts
   * // pricing.tsx
   * import React from 'react';
   * import ReactDOM from 'react-dom';
   * import { BrowserRouter, Route } from 'react-router-dom';
   *
   * import { CoreStart, AppMountParameters } from 'src/core/public';
   * import { MyPluginDepsStart } from './plugin';
   *
   * export renderApp = ({ element, history, setHeaderActionMenu }: AppMountParameters) => {
   *    const { renderApp } = await import('./pricing');
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
   * Should be used when mounting the pricing to include theme information.
   *
   * @example
   * When mounting a react pricing:
   * ```ts
   * // pricing.tsx
   * import React from 'react';
   * import ReactDOM from 'react-dom';
   *
   * import { AppMountParameters } from 'src/core/public';
   * import { wrapWithTheme } from 'src/platform/plugins/shared/kibana_react';
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
