define(function (require) {
  // we need to load the css ourselves
  require('css!plugins/metric_vis/metric_vis.css');

  // we also need to load the controller and used by the template
  require('plugins/metric_vis/metric_vis_controller');

  return function (Private) {
    var TemplateVisType = Private(require('plugins/vis_types/template/template_vis_type'));
    var Schemas = Private(require('plugins/vis_types/_schemas'));

    // return the visType object, which kibana will use to display and configure new
    // Vis object of this type.
    return new TemplateVisType({
      name: 'metric',
      title: 'Metric',
      description: 'One big number for all of your one big number needs. Perfect for show ' +
        'a count of hits, or the exact average a numeric field.',
      icon: 'fa-calculator',
      template: require('text!plugins/metric_vis/metric_vis.html'),
      params: {
        defaults: {
          fontSize: 60
        },
        editor: require('text!plugins/metric_vis/metric_vis_params.html')
      },
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Metric',
          min: 1,
          defaults: [
            { type: 'count', schema: 'metric' }
          ]
        }
      ])
    });
  };
});