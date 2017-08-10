import 'plugins/kibana/dashboard/dashboard';
import 'plugins/kibana/dashboard/saved_dashboard/saved_dashboards';
import 'plugins/kibana/dashboard/styles/index.less';
import 'plugins/kibana/dashboard/dashboard_config';
import uiRoutes from 'ui/routes';

import dashboardListingTemplate from './listing/dashboard_listing.html';
import { DashboardListingController } from './listing/dashboard_listing';
import { DashboardConstants } from './dashboard_constants';

uiRoutes
  .defaults(/dashboard/, {
    requireDefaultIndex: true
  })
  .when(DashboardConstants.LANDING_PAGE_PATH, {
    template: dashboardListingTemplate,
    controller: DashboardListingController,
    controllerAs: 'listingController'
  });
