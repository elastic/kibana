import 'plugins/kibana/visualize/styles/main.less';
import 'plugins/kibana/visualize/editor/editor';
import 'plugins/kibana/visualize/wizard/wizard';
import 'plugins/kibana/visualize/editor/agg_filter';
import 'ui/draggable/draggable_container';
import 'ui/draggable/draggable_item';
import 'ui/draggable/draggable_handle';
import 'plugins/kibana/visualize/saved_visualizations/_saved_vis';
import 'plugins/kibana/visualize/saved_visualizations/saved_visualizations';
import 'ui/directives/scroll_bottom';
import 'ui/filters/sort_prefix_first';
import uiRoutes from 'ui/routes';
import visualizeListingTemplate from './listing/visualize_listing.html';
import { VisualizeListingController } from './listing/visualize_listing';
import { VisualizeConstants } from './visualize_constants';
import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';
import { savedVisualizationProvider } from 'plugins/kibana/visualize/saved_visualizations/saved_visualization_register';
import { noneRequestHandlerProvider } from 'ui/vis/request_handlers/none';
import { CourierRequestHandlerProvider } from 'ui/vis/request_handlers/courier';
import { noneResponseHandler } from 'ui/vis/response_handlers/none';
import { BasicResponseHandlerProvider } from 'ui/vis/response_handlers/basic';

import { defaultEditor } from 'ui/vis/editors/default/default';


import { VisRequestHandlersRegistryProvider } from 'ui/registry/vis_request_handlers';
import { VisResponseHandlersRegistryProvider } from 'ui/registry/vis_response_handlers';
import { VisEditorTypesRegistryProvider } from 'ui/registry/vis_editor_types';

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
SavedObjectRegistryProvider.register(savedVisualizationProvider);
VisRequestHandlersRegistryProvider.register(CourierRequestHandlerProvider);
VisRequestHandlersRegistryProvider.register(noneRequestHandlerProvider);
VisResponseHandlersRegistryProvider.register(noneResponseHandler);
VisResponseHandlersRegistryProvider.register(BasicResponseHandlerProvider);
VisEditorTypesRegistryProvider.register(defaultEditor);

