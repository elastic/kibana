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

import './dashboard_app';
import './saved_dashboard/saved_dashboards';
import './dashboard_config';
import uiRoutes from 'ui/routes';
import { toastNotifications } from 'ui/notify';

import dashboardTemplate from './dashboard_app.html';
import dashboardListingTemplate from './listing/dashboard_listing_ng_wrapper.html';

import { DashboardConstants, createDashboardEditUrl } from './dashboard_constants';
import { InvalidJSONProperty, SavedObjectNotFound } from 'ui/errors';
import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';
import { SavedObjectsClientProvider } from 'ui/saved_objects';
import { recentlyAccessed } from 'ui/persisted_log';
import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';
import { DashboardListing, EMPTY_FILTER } from './listing/dashboard_listing';
import { uiModules } from 'ui/modules';
import { i18n } from '@kbn/i18n';

const app = uiModules.get('app/dashboard', [
  'ngRoute',
  'react',
]);

app.directive('dashboardListing', function (reactDirective) {
  return reactDirective(DashboardListing);
});

uiRoutes
  .defaults(/dashboard/, {
    requireDefaultIndex: true
  })
  .when(DashboardConstants.LANDING_PAGE_PATH, {
    template: dashboardListingTemplate,
    controller($injector, $location, $scope, Private, config, breadcrumbState) {
      const services = Private(SavedObjectRegistryProvider).byLoaderPropertiesName;
      const dashboardConfig = $injector.get('dashboardConfig');

      $scope.listingLimit = config.get('savedObjects:listingLimit');
      $scope.find = (search) => {
        return services.dashboards.find(search, $scope.listingLimit);
      };
      $scope.delete = (ids) => {
        return services.dashboards.delete(ids);
      };
      $scope.hideWriteControls = dashboardConfig.getHideWriteControls();
      $scope.initialFilter = ($location.search()).filter || EMPTY_FILTER;
      breadcrumbState.set([{
        text: i18n.translate('kbn.dashboard.dashboardBreadcrumbsTitle', {
          defaultMessage: 'Dashboards',
        }),
      }]);
    },
    resolve: {
      dash: function ($route, Private, redirectWhenMissing, kbnUrl) {
        const savedObjectsClient = Private(SavedObjectsClientProvider);
        const title = $route.current.params.title;
        if (title) {
          return savedObjectsClient.find({
            search: `"${title}"`,
            search_fields: 'title',
            type: 'dashboard',
          }).then(results => {
            // The search isn't an exact match, lets see if we can find a single exact match to use
            const matchingDashboards = results.savedObjects.filter(
              dashboard => dashboard.attributes.title.toLowerCase() === title.toLowerCase());
            if (matchingDashboards.length === 1) {
              kbnUrl.redirect(createDashboardEditUrl(matchingDashboards[0].id));
            } else {
              kbnUrl.redirect(`${DashboardConstants.LANDING_PAGE_PATH}?filter="${title}"`);
            }
            throw uiRoutes.WAIT_FOR_URL_CHANGE_TOKEN;
          }).catch(redirectWhenMissing({
            'dashboard': DashboardConstants.LANDING_PAGE_PATH
          }));
        }
      }
    }
  })
  .when(DashboardConstants.CREATE_NEW_DASHBOARD_URL, {
    template: dashboardTemplate,
    resolve: {
      dash: function (savedDashboards, redirectWhenMissing) {
        return savedDashboards.get()
          .catch(redirectWhenMissing({
            'dashboard': DashboardConstants.LANDING_PAGE_PATH
          }));
      }
    }
  })
  .when(createDashboardEditUrl(':id'), {
    template: dashboardTemplate,
    resolve: {
      dash: function (savedDashboards, Notifier, $route, $location, redirectWhenMissing, kbnUrl, AppState) {
        const id = $route.current.params.id;

        return savedDashboards.get(id)
          .then((savedDashboard) => {
            recentlyAccessed.add(savedDashboard.getFullPath(), savedDashboard.title, id);
            return savedDashboard;
          })
          .catch((error) => {
            // A corrupt dashboard was detected (e.g. with invalid JSON properties)
            if (error instanceof InvalidJSONProperty) {
              toastNotifications.addDanger(error.message);
              kbnUrl.redirect(DashboardConstants.LANDING_PAGE_PATH);
              return;
            }

            // Preserve BWC of v5.3.0 links for new, unsaved dashboards.
            // See https://github.com/elastic/kibana/issues/10951 for more context.
            if (error instanceof SavedObjectNotFound && id === 'create') {
              // Note "new AppState" is necessary so the state in the url is preserved through the redirect.
              kbnUrl.redirect(DashboardConstants.CREATE_NEW_DASHBOARD_URL, {}, new AppState());
              toastNotifications.addWarning('The url "dashboard/create" was removed in 6.0. Please update your bookmarks.');
            } else {
              throw error;
            }
          })
          .catch(redirectWhenMissing({
            'dashboard': DashboardConstants.LANDING_PAGE_PATH
          }));
      }
    }
  });

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Display and share a collection of visualizations and saved searches.',
    icon: 'dashboardApp',
    path: `/app/kibana#${DashboardConstants.LANDING_PAGE_PATH}`,
    showOnHomePage: true,
    category: FeatureCatalogueCategory.DATA
  };
});
