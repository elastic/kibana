/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { Capabilities } from '@kbn/core-capabilities-common';
import type { AppCategory } from '@kbn/core-application-common';
import type { AppMount } from './app_mount';

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
 * Defines the list of fields that can be updated via an {@link AppUpdater}.
 * @public
 */
export type AppUpdatableFields = Pick<
  App,
  'status' | 'visibleIn' | 'tooltip' | 'defaultPath' | 'deepLinks'
>;

/**
 * @public
 */
export interface App<HistoryLocationState = unknown> extends AppNavOptions {
  /**
   * The unique identifier of the application.
   *
   * Can only be composed of alphanumeric characters, `-`, `:` and `_`
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
   * Optional list of locations where the app is visible.
   *
   * Accepts the following values:
   * - "globalSearch": the link will appear in the global search bar
   * - "home": the link will appear on the Kibana home page
   * - "kibanaOverview": the link will appear in the Kibana overview page
   * - "sideNav": the link will appear in the side navigation.
   *   Note: "sideNav" will be deprecated when we change the navigation to "solutions" style.
   *
   * @default ['globalSearch', 'sideNav']
   * unless the status is marked as `inaccessible`.
   * @note Set to `[]` (empty array) to hide this link
   */
  visibleIn?: AppDeepLinkLocations[];

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
   *        visibleIn: ['globalSearch'],
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
export type PublicAppDeepLinkInfo = Omit<AppDeepLink, 'deepLinks' | 'keywords' | 'visibleIn'> & {
  deepLinks: PublicAppDeepLinkInfo[];
  keywords: string[];
  visibleIn: AppDeepLinkLocations[];
};

/** The places in the UI where a deepLink can be shown */
export type AppDeepLinkLocations = 'globalSearch' | 'sideNav' | 'home' | 'kibanaOverview';

/**
 * Input type for registering secondary in-app locations for an application.
 *
 * Deep links must include at least one of `path` or `deepLinks`. A deep link that does not have a `path`
 * represents a topological level in the application's hierarchy, but does not have a destination URL that is
 * user-accessible.
 * @public
 */
export type AppDeepLink<Id extends string = string> = {
  /** Identifier to represent this sublink, should be unique for this application */
  id: Id;
  /** Title to label represent this deep link */
  title: string;
  /** Optional keywords to match with in deep links search. Omit if this part of the hierarchy does not have a page URL. */
  keywords?: string[];
  /**
   * Optional list of locations where the deepLink is visible. By default the deepLink is visible in "globalSearch".
   */
  visibleIn?: AppDeepLinkLocations[];
  /**
   * Optional category to use instead of the parent app category.
   * This property is added to customize the way a deep link is rendered in the global search.
   * Any other feature that consumes the deep links (navigation tree, etc.) will not be affected by this addition.
   */
  category?: AppCategory;
} & AppNavOptions &
  (
    | {
        /** URL path to access this link, relative to the application's appRoute. */
        path: string;
        /** Optional array of links that are 'underneath' this section in the hierarchy */
        deepLinks?: Array<AppDeepLink<Id>>;
      }
    | {
        /** Optional path to access this section. Omit if this part of the hierarchy does not have a page URL. */
        path?: string;
        /** Array links that are 'underneath' this section in this hierarchy. */
        deepLinks: Array<AppDeepLink<Id>>;
      }
  );

/**
 * Public information about a registered {@link App | application}
 *
 * @public
 */
export type PublicAppInfo = Omit<
  App,
  'mount' | 'updater$' | 'keywords' | 'deepLinks' | 'visibleIn'
> & {
  // remove optional on fields populated with default values
  status: AppStatus;
  appRoute: string;
  keywords: string[];
  deepLinks: PublicAppDeepLinkInfo[];
  visibleIn: AppDeepLinkLocations[];
};
