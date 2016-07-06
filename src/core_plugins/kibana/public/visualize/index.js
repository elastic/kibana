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
import 'plugins/kibana/visualize/editor/draggable_container';
import 'plugins/kibana/visualize/editor/draggable_item';
import 'plugins/kibana/visualize/editor/draggable_handle';
import 'plugins/kibana/visualize/saved_visualizations/_saved_vis';
import 'plugins/kibana/visualize/saved_visualizations/saved_visualizations';
import uiRoutes from 'ui/routes';


uiRoutes
.defaults(/visualize/, {
  requireDefaultIndex: true
})
.when('/visualize', {
  redirectTo: '/visualize/step/1'
});

// preloading

require('ui/saved_objects/saved_object_registry')
.register(require('plugins/kibana/visualize/saved_visualizations/saved_visualization_register'));
