define(function (require) {
  require('plugins/kibana/visualize/styles/main.less');

  require('plugins/kibana/visualize/editor/editor');
  require('plugins/kibana/visualize/wizard/wizard');

  require('ui/routes')
  .when('/visualize', {
    redirectTo: '/visualize/step/1'
  });

  // preloading
  require('plugins/kibana/visualize/editor/add_bucket_agg');
  require('plugins/kibana/visualize/editor/agg');
  require('plugins/kibana/visualize/editor/agg_add');
  require('plugins/kibana/visualize/editor/agg_filter');
  require('plugins/kibana/visualize/editor/agg_group');
  require('plugins/kibana/visualize/editor/agg_param');
  require('plugins/kibana/visualize/editor/agg_params');
  require('plugins/kibana/visualize/editor/editor');
  require('plugins/kibana/visualize/editor/nesting_indicator');
  require('plugins/kibana/visualize/editor/sidebar');
  require('plugins/kibana/visualize/editor/vis_options');
  require('plugins/kibana/visualize/saved_visualizations/_saved_vis');
  require('plugins/kibana/visualize/saved_visualizations/saved_visualizations');

  require('ui/saved_objects/saved_object_registry')
  .register(require('plugins/kibana/visualize/saved_visualizations/saved_visualization_register'));

});
