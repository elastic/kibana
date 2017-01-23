
import _ from 'lodash';

import 'plugins/kibana/dashboard/dashboard';
import 'plugins/kibana/dashboard/saved_dashboard/saved_dashboards';
import 'plugins/kibana/dashboard/styles/index.less';
import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';
import { savedDashboardRegister } from 'plugins/kibana/dashboard/saved_dashboard/saved_dashboard_register';
import { getTopNavConfig } from './top_nav/get_top_nav_config';
import { createPanelState } from 'plugins/kibana/dashboard/panel/panel_state';
import { DashboardConstants } from './dashboard_constants';
import UtilsBrushEventProvider from 'ui/utils/brush_event';
import FilterBarFilterBarClickHandlerProvider from 'ui/filter_bar/filter_bar_click_handler';
import { FilterUtils } from './filter_utils';

import dashboardListingTemplate from './listing/dashboard_listing.html';
import { DashboardListingController } from './listing/dashboard_listing';

require('ui/saved_objects/saved_object_registry').register(savedDashboardRegister);

uiRoutes
  .defaults(/dashboard/, {
    requireDefaultIndex: true
  })
  .when('/dashboard', {
    template: dashboardListingTemplate,
    controller: DashboardListingController,
    controllerAs: 'listingController'
  });
