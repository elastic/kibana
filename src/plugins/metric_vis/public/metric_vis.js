import 'plugins/metric_vis/metric_vis.less';
import 'plugins/metric_vis/metric_vis_controller';
import TemplateVisTypeTemplateVisTypeProvider from 'ui/template_vis_type/TemplateVisType';
import VisSchemasProvider from 'ui/Vis/Schemas';
define(function (require) {
  // we need to load the css ourselves

  // we also need to load the controller and used by the template

  // register the provider with the visTypes registry
  require('ui/registry/vis_types').register(MetricVisProvider);

  function MetricVisProvider(Private) {
    const TemplateVisType = Private(TemplateVisTypeTemplateVisTypeProvider);
    const Schemas = Private(VisSchemasProvider);

    // return the visType object, which kibana will use to display and configure new
    // Vis object of this type.
    return new TemplateVisType({
      name: 'metric',
      title: 'Metric',
      description: 'One big number for all of your one big number needs. Perfect for showing ' +
        'a count of hits, or the exact average a numeric field.',
      icon: 'fa-calculator',
      template: require('plugins/metric_vis/metric_vis.html'),
      params: {
        defaults: {
          handleNoResults: true,
          fontSize: 60
        },
        editor: require('plugins/metric_vis/metric_vis_params.html')
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
  }

  // export the provider so that the visType can be required with Private()
  return MetricVisProvider;
});
