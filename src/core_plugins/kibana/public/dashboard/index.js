import 'plugins/kibana/dashboard/dashboard';
import 'plugins/kibana/dashboard/saved_dashboard/saved_dashboards';
import 'plugins/kibana/dashboard/styles/index.less';
import 'plugins/kibana/dashboard/dashboard_config';
import uiRoutes from 'ui/routes';
import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';
import { savedDashboardRegister } from 'plugins/kibana/dashboard/saved_dashboard/saved_dashboard_register';

import dashboardListingTemplate from './listing/dashboard_listing.html';
import { DashboardListingController } from './listing/dashboard_listing';
import { DashboardConstants } from './dashboard_constants';

SavedObjectRegistryProvider.register(savedDashboardRegister);

uiRoutes
  .defaults(/dashboard/, {
    requireDefaultIndex: true
  })
  .when(DashboardConstants.LANDING_PAGE_PATH, {
    template: dashboardListingTemplate,
    controller: DashboardListingController,
    controllerAs: 'listingController'
  });
