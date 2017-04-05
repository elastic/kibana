import 'plugins/kibana/dashboard/dashboard';
import 'plugins/kibana/dashboard/saved_dashboard/saved_dashboards';
import 'plugins/kibana/dashboard/styles/index.less';
import uiRoutes from 'ui/routes';
import savedObjectRegistry from 'ui/saved_objects/saved_object_registry';
import { savedDashboardRegister } from 'plugins/kibana/dashboard/saved_dashboard/saved_dashboard_register';

import dashboardListingTemplate from './listing/dashboard_listing.html';
import { DashboardListingController } from './listing/dashboard_listing';
import { DashboardConstants } from './dashboard_constants';

savedObjectRegistry.register(savedDashboardRegister);

uiRoutes
  .defaults(/dashboard/, {
    requireDefaultIndex: true
  })
  .when('/dashboard', {
    // For BWC, preserve unsaved dashboard links (i.e. links with state data and no ID) prior to v5.3
    redirectTo: DashboardConstants.CREATE_NEW_DASHBOARD_URL
  })
  .when(DashboardConstants.LANDING_PAGE_PATH, {
    template: dashboardListingTemplate,
    controller: DashboardListingController,
    controllerAs: 'listingController'
  })
  .when('/dashboard/:id', {
    // For BWC, preserve saved dashboard links prior to v5.3
    redirectTo: `${DashboardConstants.DASHBOARD_EDIT_PATH}/:id`
  });

