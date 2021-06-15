/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { getState } from '../apps/main/services/discover_state';
import indexTemplateLegacy from './discover_legacy.html';
import {
  getAngularModule,
  getServices,
  getUrlTracker,
  redirectWhenMissing,
} from '../../kibana_services';
import { getRootBreadcrumbs, getSavedSearchBreadcrumbs } from '../helpers/breadcrumbs';
import { loadIndexPattern, resolveIndexPattern } from '../apps/main/utils/resolve_index_pattern';

const services = getServices();

const {
  core,
  capabilities,
  chrome,
  data,
  history: getHistory,
  toastNotifications,
  uiSettings: config,
} = getServices();

const app = getAngularModule();

app.config(($routeProvider) => {
  const defaults = {
    requireDefaultIndex: true,
    requireUICapability: 'discover.show',
    k7Breadcrumbs: ($route, $injector) =>
      $injector.invoke($route.current.params.id ? getSavedSearchBreadcrumbs : getRootBreadcrumbs),
    badge: () => {
      if (capabilities.discover.save) {
        return undefined;
      }

      return {
        text: i18n.translate('discover.badge.readOnly.text', {
          defaultMessage: 'Read only',
        }),
        tooltip: i18n.translate('discover.badge.readOnly.tooltip', {
          defaultMessage: 'Unable to save searches',
        }),
        iconType: 'glasses',
      };
    },
  };
  const discoverRoute = {
    ...defaults,
    template: indexTemplateLegacy,
    reloadOnSearch: false,
    resolve: {
      savedObjects: function ($route, Promise) {
        const history = getHistory();
        const savedSearchId = $route.current.params.id;
        return data.indexPatterns.ensureDefaultIndexPattern(history).then(() => {
          const { appStateContainer } = getState({ history, uiSettings: config });
          const { index } = appStateContainer.getState();
          return Promise.props({
            ip: loadIndexPattern(index, data.indexPatterns, config),
            savedSearch: getServices()
              .getSavedSearchById(savedSearchId)
              .then((savedSearch) => {
                if (savedSearchId) {
                  chrome.recentlyAccessed.add(
                    savedSearch.getFullPath(),
                    savedSearch.title,
                    savedSearchId
                  );
                }
                return savedSearch;
              })
              .catch(
                redirectWhenMissing({
                  history,
                  navigateToApp: core.application.navigateToApp,
                  mapping: {
                    search: '/',
                    'index-pattern': {
                      app: 'management',
                      path: `kibana/objects/savedSearches/${$route.current.params.id}`,
                    },
                  },
                  toastNotifications,
                  onBeforeRedirect() {
                    getUrlTracker().setTrackedUrl('/');
                  },
                })
              ),
          });
        });
      },
    },
  };

  $routeProvider.when('/view/:id?', discoverRoute);
  $routeProvider.when('/', discoverRoute);
});

app.directive('discoverApp', function () {
  return {
    restrict: 'E',
    controllerAs: 'discoverApp',
    controller: discoverController,
  };
});

function discoverController($route, $scope) {
  const savedSearch = $route.current.locals.savedObjects.savedSearch;
  $scope.indexPattern = resolveIndexPattern(
    $route.current.locals.savedObjects.ip,
    savedSearch.searchSource,
    toastNotifications
  );

  const history = getHistory();

  $scope.opts = {
    savedSearch,
    history,
    services,
    indexPatternList: $route.current.locals.savedObjects.ip.list,
    navigateTo: (path) => {
      $scope.$evalAsync(() => {
        history.push(path);
      });
    },
  };

  $scope.$on('$destroy', () => {
    savedSearch.destroy();
    data.search.session.clear();
  });
}
