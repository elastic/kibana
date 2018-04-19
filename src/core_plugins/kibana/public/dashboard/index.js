import './dashboard_app';
import './saved_dashboard/saved_dashboards';
import './styles/index.less';
import './dashboard_config';
import uiRoutes from 'ui/routes';
import { toastNotifications } from 'ui/notify';

import dashboardTemplate from './dashboard_app.html';
import dashboardListingTemplate from './listing/dashboard_listing.html';

import { DashboardListingController } from './listing/dashboard_listing';
import { DashboardConstants, createDashboardEditUrl } from './dashboard_constants';
import { SavedObjectNotFound } from 'ui/errors';
import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';
import { SavedObjectsClientProvider } from 'ui/saved_objects';
import { recentlyAccessed } from 'ui/persisted_log';

uiRoutes
  .defaults(/dashboard/, {
    requireDefaultIndex: true
  })
  .when(DashboardConstants.LANDING_PAGE_PATH, {
    template: dashboardListingTemplate,
    controller: DashboardListingController,
    controllerAs: 'listingController',
    resolve: {
      dash: function ($route, Private, courier, kbnUrl) {
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
          }).catch(courier.redirectWhenMissing({
            'dashboard': DashboardConstants.LANDING_PAGE_PATH
          }));
        }
      }
    }
  })
  .when(DashboardConstants.CREATE_NEW_DASHBOARD_URL, {
    template: dashboardTemplate,
    resolve: {
      dash: function (savedDashboards, courier) {
        return savedDashboards.get()
          .catch(courier.redirectWhenMissing({
            'dashboard': DashboardConstants.LANDING_PAGE_PATH
          }));
      }
    }
  })
  .when(createDashboardEditUrl(':id'), {
    template: dashboardTemplate,
    resolve: {
      dash: function (savedDashboards, Notifier, $route, $location, courier, kbnUrl, AppState) {
        const id = $route.current.params.id;

        return savedDashboards.get(id)
          .then((savedDashboard) => {
            recentlyAccessed.add(savedDashboard.getFullPath(), savedDashboard.title, id);
            return savedDashboard;
          })
          .catch((error) => {
            // Preserve BWC of v5.3.0 links for new, unsaved dashboards.
            // See https://github.com/elastic/kibana/issues/10951 for more context.
            if (error instanceof SavedObjectNotFound && id === 'create') {
              // Note "new AppState" is neccessary so the state in the url is preserved through the redirect.
              kbnUrl.redirect(DashboardConstants.CREATE_NEW_DASHBOARD_URL, {}, new AppState());
              toastNotifications.addWarning('The url "dashboard/create" was removed in 6.0. Please update your bookmarks.');
            } else {
              throw error;
            }
          })
          .catch(courier.redirectWhenMissing({
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
    icon: '/plugins/kibana/assets/app_dashboard.svg',
    path: `/app/kibana#${DashboardConstants.LANDING_PAGE_PATH}`,
    showOnHomePage: true,
    category: FeatureCatalogueCategory.DATA
  };
});
