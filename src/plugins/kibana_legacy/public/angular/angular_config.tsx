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

import {
  auto,
  ICompileProvider,
  IHttpProvider,
  IHttpService,
  ILocationProvider,
  ILocationService,
  IModule,
  IRootScopeService,
} from 'angular';
import $ from 'jquery';
import { cloneDeep, forOwn, get, set } from 'lodash';
import React, { Fragment } from 'react';
import * as Rx from 'rxjs';
import { ChromeBreadcrumb, EnvironmentMode, PackageInfo } from 'kibana/public';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { CoreStart, LegacyCoreStart } from 'kibana/public';
import { modifyUrl } from '../../../../core/utils';
import { toMountPoint } from '../../../kibana_react/public';
import { isSystemApiRequest, UrlOverflowService } from '../utils';
import { formatAngularHttpError, isAngularHttpError } from '../notify/lib';

const URL_LIMIT_WARN_WITHIN = 1000;

export interface RouteConfiguration {
  controller?: string | ((...args: any[]) => void);
  redirectTo?: string;
  resolveRedirectTo?: (...args: any[]) => void;
  reloadOnSearch?: boolean;
  reloadOnUrl?: boolean;
  outerAngularWrapperRoute?: boolean;
  resolve?: object;
  template?: string;
  k7Breadcrumbs?: (...args: any[]) => ChromeBreadcrumb[];
  requireUICapability?: string;
}

/**
 * Detects whether a given angular route is a dummy route that doesn't
 * require any action. There are two ways this can happen:
 * If `outerAngularWrapperRoute` is set on the route config object,
 * it means the local application service set up this route on the outer angular
 * and the internal routes will handle the hooks.
 *
 * If angular did not detect a route and it is the local angular, we are currently
 * navigating away from a URL controlled by a local angular router and the
 * application will get unmounted. In this case the outer router will handle
 * the hooks.
 * @param $route Injected $route dependency
 * @param isLocalAngular Flag whether this is the local angular router
 */
function isDummyRoute($route: any, isLocalAngular: boolean) {
  return (
    ($route.current && $route.current.$$route && $route.current.$$route.outerAngularWrapperRoute) ||
    (!$route.current && isLocalAngular)
  );
}

export const configureAppAngularModule = (
  angularModule: IModule,
  newPlatform:
    | LegacyCoreStart
    | {
        core: CoreStart;
        readonly env: {
          mode: Readonly<EnvironmentMode>;
          packageInfo: Readonly<PackageInfo>;
        };
      },
  isLocalAngular: boolean
) => {
  const core = 'core' in newPlatform ? newPlatform.core : newPlatform;
  const packageInfo =
    'injectedMetadata' in newPlatform
      ? newPlatform.injectedMetadata.getLegacyMetadata()
      : newPlatform.env.packageInfo;

  if ('injectedMetadata' in newPlatform) {
    forOwn(newPlatform.injectedMetadata.getInjectedVars(), (val, name) => {
      if (name !== undefined) {
        // The legacy platform modifies some of these values, clone to an unfrozen object.
        angularModule.value(name, cloneDeep(val));
      }
    });
  }

  angularModule
    .value('kbnVersion', packageInfo.version)
    .value('buildNum', packageInfo.buildNum)
    .value('buildSha', packageInfo.buildSha)
    .value('esUrl', getEsUrl(core))
    .value('uiCapabilities', core.application.capabilities)
    .config(
      setupCompileProvider(
        'injectedMetadata' in newPlatform
          ? newPlatform.injectedMetadata.getLegacyMetadata().devMode
          : newPlatform.env.mode.dev
      )
    )
    .config(setupLocationProvider())
    .config($setupXsrfRequestInterceptor(packageInfo.version))
    .run(capture$httpLoadingCount(core))
    .run($setupBreadcrumbsAutoClear(core, isLocalAngular))
    .run($setupBadgeAutoClear(core, isLocalAngular))
    .run($setupHelpExtensionAutoClear(core, isLocalAngular))
    .run($setupUrlOverflowHandling(core, isLocalAngular))
    .run($setupUICapabilityRedirect(core));
};

const getEsUrl = (newPlatform: CoreStart) => {
  const a = document.createElement('a');
  a.href = newPlatform.http.basePath.prepend('/elasticsearch');
  const protocolPort = /https/.test(a.protocol) ? 443 : 80;
  const port = a.port || protocolPort;
  return {
    host: a.hostname,
    port,
    protocol: a.protocol,
    pathname: a.pathname,
  };
};

const setupCompileProvider = (devMode: boolean) => ($compileProvider: ICompileProvider) => {
  if (!devMode) {
    $compileProvider.debugInfoEnabled(false);
  }
};

const setupLocationProvider = () => ($locationProvider: ILocationProvider) => {
  $locationProvider.html5Mode({
    enabled: false,
    requireBase: false,
    rewriteLinks: false,
  });

  $locationProvider.hashPrefix('');
};

export const $setupXsrfRequestInterceptor = (version: string) => {
  // Configure jQuery prefilter
  $.ajaxPrefilter(({ kbnXsrfToken = true }: any, originalOptions, jqXHR) => {
    if (kbnXsrfToken) {
      jqXHR.setRequestHeader('kbn-version', version);
    }
  });

  return ($httpProvider: IHttpProvider) => {
    // Configure $httpProvider interceptor
    $httpProvider.interceptors.push(() => {
      return {
        request(opts) {
          const { kbnXsrfToken = true } = opts as any;
          if (kbnXsrfToken) {
            set(opts, ['headers', 'kbn-version'], version);
          }
          return opts;
        },
      };
    });
  };
};

/**
 * Injected into angular module by ui/chrome angular integration
 * and adds a root-level watcher that will capture the count of
 * active $http requests on each digest loop and expose the count to
 * the core.loadingCount api
 */
const capture$httpLoadingCount = (newPlatform: CoreStart) => (
  $rootScope: IRootScopeService,
  $http: IHttpService
) => {
  newPlatform.http.addLoadingCountSource(
    new Rx.Observable(observer => {
      const unwatch = $rootScope.$watch(() => {
        const reqs = $http.pendingRequests || [];
        observer.next(reqs.filter(req => !isSystemApiRequest(req)).length);
      });

      return unwatch;
    })
  );
};

/**
 * integrates with angular to automatically redirect to home if required
 * capability is not met
 */
const $setupUICapabilityRedirect = (newPlatform: CoreStart) => (
  $rootScope: IRootScopeService,
  $injector: any
) => {
  const isKibanaAppRoute = window.location.pathname.endsWith('/app/kibana');
  // this feature only works within kibana app for now after everything is
  // switched to the application service, this can be changed to handle all
  // apps.
  if (!isKibanaAppRoute) {
    return;
  }
  $rootScope.$on(
    '$routeChangeStart',
    (event, { $$route: route }: { $$route?: RouteConfiguration } = {}) => {
      if (!route || !route.requireUICapability) {
        return;
      }

      if (!get(newPlatform.application.capabilities, route.requireUICapability)) {
        $injector.get('kbnUrl').change('/home');
        event.preventDefault();
      }
    }
  );
};

/**
 * internal angular run function that will be called when angular bootstraps and
 * lets us integrate with the angular router so that we can automatically clear
 * the breadcrumbs if we switch to a Kibana app that does not use breadcrumbs correctly
 */
const $setupBreadcrumbsAutoClear = (newPlatform: CoreStart, isLocalAngular: boolean) => (
  $rootScope: IRootScopeService,
  $injector: any
) => {
  // A flag used to determine if we should automatically
  // clear the breadcrumbs between angular route changes.
  let breadcrumbSetSinceRouteChange = false;
  const $route = $injector.has('$route') ? $injector.get('$route') : {};

  // reset breadcrumbSetSinceRouteChange any time the breadcrumbs change, even
  // if it was done directly through the new platform
  newPlatform.chrome.getBreadcrumbs$().subscribe({
    next() {
      breadcrumbSetSinceRouteChange = true;
    },
  });

  $rootScope.$on('$routeChangeStart', () => {
    breadcrumbSetSinceRouteChange = false;
  });

  $rootScope.$on('$routeChangeSuccess', () => {
    if (isDummyRoute($route, isLocalAngular)) {
      return;
    }
    const current = $route.current || {};

    if (breadcrumbSetSinceRouteChange || (current.$$route && current.$$route.redirectTo)) {
      return;
    }

    const k7BreadcrumbsProvider = current.k7Breadcrumbs;
    if (!k7BreadcrumbsProvider) {
      newPlatform.chrome.setBreadcrumbs([]);
      return;
    }

    try {
      newPlatform.chrome.setBreadcrumbs($injector.invoke(k7BreadcrumbsProvider));
    } catch (error) {
      if (isAngularHttpError(error)) {
        error = formatAngularHttpError(error);
      }
      newPlatform.fatalErrors.add(error, 'location');
    }
  });
};

/**
 * internal angular run function that will be called when angular bootstraps and
 * lets us integrate with the angular router so that we can automatically clear
 * the badge if we switch to a Kibana app that does not use the badge correctly
 */
const $setupBadgeAutoClear = (newPlatform: CoreStart, isLocalAngular: boolean) => (
  $rootScope: IRootScopeService,
  $injector: any
) => {
  // A flag used to determine if we should automatically
  // clear the badge between angular route changes.
  let badgeSetSinceRouteChange = false;
  const $route = $injector.has('$route') ? $injector.get('$route') : {};

  $rootScope.$on('$routeChangeStart', () => {
    badgeSetSinceRouteChange = false;
  });

  $rootScope.$on('$routeChangeSuccess', () => {
    if (isDummyRoute($route, isLocalAngular)) {
      return;
    }
    const current = $route.current || {};

    if (badgeSetSinceRouteChange || (current.$$route && current.$$route.redirectTo)) {
      return;
    }

    const badgeProvider = current.badge;
    if (!badgeProvider) {
      newPlatform.chrome.setBadge(undefined);
      return;
    }

    try {
      newPlatform.chrome.setBadge($injector.invoke(badgeProvider));
    } catch (error) {
      if (isAngularHttpError(error)) {
        error = formatAngularHttpError(error);
      }
      newPlatform.fatalErrors.add(error, 'location');
    }
  });
};

/**
 * internal angular run function that will be called when angular bootstraps and
 * lets us integrate with the angular router so that we can automatically clear
 * the helpExtension if we switch to a Kibana app that does not set its own
 * helpExtension
 */
const $setupHelpExtensionAutoClear = (newPlatform: CoreStart, isLocalAngular: boolean) => (
  $rootScope: IRootScopeService,
  $injector: any
) => {
  /**
   * reset helpExtensionSetSinceRouteChange any time the helpExtension changes, even
   * if it was done directly through the new platform
   */
  let helpExtensionSetSinceRouteChange = false;
  newPlatform.chrome.getHelpExtension$().subscribe({
    next() {
      helpExtensionSetSinceRouteChange = true;
    },
  });

  const $route = $injector.has('$route') ? $injector.get('$route') : {};

  $rootScope.$on('$routeChangeStart', () => {
    if (isDummyRoute($route, isLocalAngular)) {
      return;
    }
    helpExtensionSetSinceRouteChange = false;
  });

  $rootScope.$on('$routeChangeSuccess', () => {
    if (isDummyRoute($route, isLocalAngular)) {
      return;
    }
    const current = $route.current || {};

    if (helpExtensionSetSinceRouteChange || (current.$$route && current.$$route.redirectTo)) {
      return;
    }

    newPlatform.chrome.setHelpExtension(current.helpExtension);
  });
};

const $setupUrlOverflowHandling = (newPlatform: CoreStart, isLocalAngular: boolean) => (
  $location: ILocationService,
  $rootScope: IRootScopeService,
  $injector: auto.IInjectorService
) => {
  const $route = $injector.has('$route') ? $injector.get('$route') : {};
  const urlOverflow = new UrlOverflowService();
  const check = () => {
    if (isDummyRoute($route, isLocalAngular)) {
      return;
    }
    // disable long url checks when storing state in session storage
    if (newPlatform.uiSettings.get('state:storeInSessionStorage')) {
      return;
    }

    if ($location.path() === '/error/url-overflow') {
      return;
    }

    try {
      if (urlOverflow.check($location.absUrl()) <= URL_LIMIT_WARN_WITHIN) {
        newPlatform.notifications.toasts.addWarning({
          title: i18n.translate('kibana_legacy.bigUrlWarningNotificationTitle', {
            defaultMessage: 'The URL is big and Kibana might stop working',
          }),
          text: toMountPoint(
            <Fragment>
              <FormattedMessage
                id="kibana_legacy.bigUrlWarningNotificationMessage"
                defaultMessage="Either enable the {storeInSessionStorageParam} option
                  in {advancedSettingsLink} or simplify the onscreen visuals."
                values={{
                  storeInSessionStorageParam: <code>state:storeInSessionStorage</code>,
                  advancedSettingsLink: (
                    <a href="#/management/kibana/settings">
                      <FormattedMessage
                        id="kibana_legacy.bigUrlWarningNotificationMessage.advancedSettingsLinkText"
                        defaultMessage="advanced settings"
                      />
                    </a>
                  ),
                }}
              />
            </Fragment>
          ),
        });
      }
    } catch (e) {
      window.location.href = modifyUrl(window.location.href, (parts: any) => {
        parts.hash = '#/error/url-overflow';
      });
      // force the browser to reload to that Kibana's potentially unstable state is unloaded
      window.location.reload();
    }
  };

  $rootScope.$on('$routeUpdate', check);
  $rootScope.$on('$routeChangeStart', check);
};
