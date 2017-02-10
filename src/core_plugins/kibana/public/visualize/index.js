import 'plugins/kibana/visualize/styles/main.less';
import 'plugins/kibana/visualize/editor/editor';
import 'plugins/kibana/visualize/wizard/wizard';
import 'plugins/kibana/visualize/editor/add_bucket_agg';
import 'plugins/kibana/visualize/editor/agg';
import 'plugins/kibana/visualize/editor/agg_add';
import 'plugins/kibana/visualize/editor/agg_filter';
import 'plugins/kibana/visualize/editor/agg_group';
import 'plugins/kibana/visualize/editor/agg_param';
import 'plugins/kibana/visualize/editor/agg_params';
import 'plugins/kibana/visualize/editor/nesting_indicator';
import 'plugins/kibana/visualize/editor/sidebar';
import 'plugins/kibana/visualize/editor/vis_options';
import 'ui/draggable/draggable_container';
import 'ui/draggable/draggable_item';
import 'ui/draggable/draggable_handle';
import 'plugins/kibana/visualize/saved_visualizations/_saved_vis';
import 'plugins/kibana/visualize/saved_visualizations/saved_visualizations';
import uiRoutes from 'ui/routes';
import visualizeListingTemplate from './listing/visualize_listing.html';
import { VisualizeListingController } from './listing/visualize_listing';
import { VisualizeConstants } from './visualize_constants';
import savedObjectRegistry from 'ui/saved_objects/saved_object_registry';
import savedVisusalizationProvider from 'plugins/kibana/visualize/saved_visualizations/saved_visualization_register';

import { CreateOrDeleteButton } from './listing/create_or_delete_button';

import uiModules from 'ui/modules';
const app = uiModules.get('app/visualize', ['react']);
app.directive('createOrDeleteButton', function (reactDirective) {
  return reactDirective(CreateOrDeleteButton);
});

uiRoutes
.defaults(/visualize/, {
  requireDefaultIndex: true
})
.when(VisualizeConstants.LANDING_PAGE_PATH, {
  template: visualizeListingTemplate,
  controller: VisualizeListingController,
  controllerAs: 'listingController',
});

// preloading

savedObjectRegistry.register(savedVisusalizationProvider);
