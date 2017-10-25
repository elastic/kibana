import 'plugins/kibana/dashboard/dashboard_app';
import 'plugins/kibana/dashboard/saved_dashboard/saved_dashboards';
import 'plugins/kibana/dashboard/styles/index.less';
import 'plugins/kibana/dashboard/dashboard_config';
import uiRoutes from 'ui/routes';
import { notify } from 'ui/notify';

import dashboardTemplate from 'plugins/kibana/dashboard/dashboard_app.html';
import dashboardListingTemplate from './listing/dashboard_listing.html';

import { DashboardListingController } from './listing/dashboard_listing';
import { DashboardConstants, createDashboardEditUrl } from './dashboard_constants';
import { SavedObjectNotFound } from 'ui/errors';
import { KbnDirectoryRegistryProvider, DirectoryCategory } from 'ui/registry/kbn_directory';

uiRoutes
  .defaults(/dashboard/, {
    requireDefaultIndex: true
  })
  .when(DashboardConstants.LANDING_PAGE_PATH, {
    template: dashboardListingTemplate,
    controller: DashboardListingController,
    controllerAs: 'listingController'
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
          .catch((error) => {
            // Preserve BWC of v5.3.0 links for new, unsaved dashboards.
            // See https://github.com/elastic/kibana/issues/10951 for more context.
            if (error instanceof SavedObjectNotFound && id === 'create') {
              // Note "new AppState" is neccessary so the state in the url is preserved through the redirect.
              kbnUrl.redirect(DashboardConstants.CREATE_NEW_DASHBOARD_URL, {}, new AppState());
              notify.error(
                'The url "dashboard/create" is deprecated and will be removed in 6.0. Please update your bookmarks.');
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

KbnDirectoryRegistryProvider.register(() => {
  return {
    id: 'dashboard',
    title: 'Dashboards',
    description: 'Create visual landing pages made up of content from other apps',
    icon: '/plugins/kibana/assets/app_dashboard.svg',
    path: '/app/kibana#/dashboard',
    showOnHomePage: true,
    category: DirectoryCategory.DATA
  };
});
