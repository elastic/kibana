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

import { i18n } from '@kbn/i18n';
import { parse } from 'query-string';

import dashboardTemplate from './dashboard_app.html';
import dashboardListingTemplate from './listing/dashboard_listing_ng_wrapper.html';
import { createHashHistory } from 'history';

import { initDashboardAppDirective } from './dashboard_app';
import { createDashboardEditUrl, DashboardConstants } from '../dashboard_constants';
import {
  createKbnUrlStateStorage,
  redirectWhenMissing,
  SavedObjectNotFound,
} from '../../../kibana_utils/public';
import { DashboardListing, EMPTY_FILTER } from './listing/dashboard_listing';
import { addHelpMenuToAppChrome } from './help_menu/help_menu_util';
import { syncQueryStateWithUrl } from '../../../data/public';

export function initDashboardApp(app, deps) {
  initDashboardAppDirective(app, deps);

  app.directive('dashboardListing', function (reactDirective) {
    return reactDirective(DashboardListing, [
      ['core', { watchDepth: 'reference' }],
      ['createItem', { watchDepth: 'reference' }],
      ['getViewUrl', { watchDepth: 'reference' }],
      ['editItem', { watchDepth: 'reference' }],
      ['findItems', { watchDepth: 'reference' }],
      ['deleteItems', { watchDepth: 'reference' }],
      ['listingLimit', { watchDepth: 'reference' }],
      ['hideWriteControls', { watchDepth: 'reference' }],
      ['initialFilter', { watchDepth: 'reference' }],
      ['initialPageSize', { watchDepth: 'reference' }],
    ]);
  });

  function createNewDashboardCtrl($scope) {
    $scope.visitVisualizeAppLinkText = i18n.translate('dashboard.visitVisualizeAppLinkText', {
      defaultMessage: 'visit the Visualize app',
    });
    addHelpMenuToAppChrome(deps.chrome, deps.core.docLinks);
  }

  app.factory('history', () => createHashHistory());
  app.factory('kbnUrlStateStorage', (history) =>
    createKbnUrlStateStorage({
      history,
      useHash: deps.uiSettings.get('state:storeInSessionStorage'),
    })
  );

  app.config(function ($routeProvider) {
    const defaults = {
      reloadOnSearch: false,
      requireUICapability: 'dashboard.show',
      badge: () => {
        if (deps.dashboardCapabilities.showWriteControls) {
          return undefined;
        }

        return {
          text: i18n.translate('dashboard.badge.readOnly.text', {
            defaultMessage: 'Read only',
          }),
          tooltip: i18n.translate('dashboard.badge.readOnly.tooltip', {
            defaultMessage: 'Unable to save dashboards',
          }),
          iconType: 'glasses',
        };
      },
    };

    $routeProvider
      .when('/', {
        redirectTo: DashboardConstants.LANDING_PAGE_PATH,
      })
      .when(DashboardConstants.LANDING_PAGE_PATH, {
        ...defaults,
        template: dashboardListingTemplate,
        controller: function ($scope, kbnUrlStateStorage, history) {
          deps.core.chrome.docTitle.change(
            i18n.translate('dashboard.dashboardPageTitle', { defaultMessage: 'Dashboards' })
          );
          const service = deps.savedDashboards;
          const dashboardConfig = deps.dashboardConfig;

          // syncs `_g` portion of url with query services
          const { stop: stopSyncingQueryServiceStateWithUrl } = syncQueryStateWithUrl(
            deps.data.query,
            kbnUrlStateStorage
          );

          $scope.listingLimit = deps.savedObjects.settings.getListingLimit();
          $scope.initialPageSize = deps.savedObjects.settings.getPerPage();
          $scope.create = () => {
            history.push(DashboardConstants.CREATE_NEW_DASHBOARD_URL);
          };
          $scope.find = (search) => {
            return service.find(search, $scope.listingLimit);
          };
          $scope.editItem = ({ id }) => {
            history.push(`${createDashboardEditUrl(id)}?_a=(viewMode:edit)`);
          };
          $scope.getViewUrl = ({ id }) => {
            return deps.addBasePath(`#${createDashboardEditUrl(id)}`);
          };
          $scope.delete = (dashboards) => {
            return service.delete(dashboards.map((d) => d.id));
          };
          $scope.hideWriteControls = dashboardConfig.getHideWriteControls();
          $scope.initialFilter = parse(history.location.search).filter || EMPTY_FILTER;
          deps.chrome.setBreadcrumbs([
            {
              text: i18n.translate('dashboard.dashboardBreadcrumbsTitle', {
                defaultMessage: 'Dashboards',
              }),
            },
          ]);
          addHelpMenuToAppChrome(deps.chrome, deps.core.docLinks);
          $scope.core = deps.core;

          $scope.$on('$destroy', () => {
            stopSyncingQueryServiceStateWithUrl();
          });
        },
        resolve: {
          dash: function ($route, history) {
            return deps.data.indexPatterns.ensureDefaultIndexPattern(history).then(() => {
              const savedObjectsClient = deps.savedObjectsClient;
              const title = $route.current.params.title;
              if (title) {
                return savedObjectsClient
                  .find({
                    search: `"${title}"`,
                    search_fields: 'title',
                    type: 'dashboard',
                  })
                  .then((results) => {
                    // The search isn't an exact match, lets see if we can find a single exact match to use
                    const matchingDashboards = results.savedObjects.filter(
                      (dashboard) =>
                        dashboard.attributes.title.toLowerCase() === title.toLowerCase()
                    );
                    if (matchingDashboards.length === 1) {
                      history.replace(createDashboardEditUrl(matchingDashboards[0].id));
                    } else {
                      history.replace(`${DashboardConstants.LANDING_PAGE_PATH}?filter="${title}"`);
                      $route.reload();
                    }
                    return new Promise(() => {});
                  });
              }
            });
          },
        },
      })
      .when(DashboardConstants.CREATE_NEW_DASHBOARD_URL, {
        ...defaults,
        template: dashboardTemplate,
        controller: createNewDashboardCtrl,
        requireUICapability: 'dashboard.createNew',
        resolve: {
          dash: (history) =>
            deps.data.indexPatterns
              .ensureDefaultIndexPattern(history)
              .then(() => deps.savedDashboards.get())
              .catch(
                redirectWhenMissing({
                  history,
                  navigateToApp: deps.core.application.navigateToApp,
                  mapping: {
                    dashboard: DashboardConstants.LANDING_PAGE_PATH,
                  },
                  toastNotifications: deps.core.notifications.toasts,
                })
              ),
        },
      })
      .when(createDashboardEditUrl(':id'), {
        ...defaults,
        template: dashboardTemplate,
        controller: createNewDashboardCtrl,
        resolve: {
          dash: function ($route, history) {
            const id = $route.current.params.id;

            return deps.data.indexPatterns
              .ensureDefaultIndexPattern(history)
              .then(() => deps.savedDashboards.get(id))
              .then((savedDashboard) => {
                deps.chrome.recentlyAccessed.add(
                  savedDashboard.getFullPath(),
                  savedDashboard.title,
                  id
                );
                return savedDashboard;
              })
              .catch((error) => {
                // Preserve BWC of v5.3.0 links for new, unsaved dashboards.
                // See https://github.com/elastic/kibana/issues/10951 for more context.
                if (error instanceof SavedObjectNotFound && id === 'create') {
                  // Note preserve querystring part is necessary so the state is preserved through the redirect.
                  history.replace({
                    ...history.location, // preserve query,
                    pathname: DashboardConstants.CREATE_NEW_DASHBOARD_URL,
                  });

                  deps.core.notifications.toasts.addWarning(
                    i18n.translate('dashboard.urlWasRemovedInSixZeroWarningMessage', {
                      defaultMessage:
                        'The url "dashboard/create" was removed in 6.0. Please update your bookmarks.',
                    })
                  );
                  return new Promise(() => {});
                } else {
                  // E.g. a corrupt or deleted dashboard
                  deps.core.notifications.toasts.addDanger(error.message);
                  history.push(DashboardConstants.LANDING_PAGE_PATH);
                  return new Promise(() => {});
                }
              });
          },
        },
      })
      .otherwise({
        resolveRedirectTo: function ($rootScope) {
          const path = window.location.hash.substr(1);
          deps.restorePreviousUrl();
          $rootScope.$applyAsync(() => {
            const { navigated } = deps.navigateToLegacyKibanaUrl(path);
            if (!navigated) {
              deps.navigateToDefaultApp();
            }
          });
          // prevent angular from completing the navigation
          return new Promise(() => {});
        },
      });
  });
}
