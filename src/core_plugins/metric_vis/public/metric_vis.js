import 'plugins/metric_vis/metric_vis.less';
import 'plugins/metric_vis/metric_vis_controller';
import VisVisTypeProvider from 'ui/vis/vis_type';
import TemplateVisTypeTemplateVisTypeProvider from 'ui/template_vis_type/template_vis_type';
import VisSchemasProvider from 'ui/vis/schemas';
import metricVisTemplate from 'plugins/metric_vis/metric_vis.html';
import metricVisParamsTemplate from 'plugins/metric_vis/metric_vis_params.html';
import visTypesRegistry from 'ui/registry/vis_types';
import image from './images/icon-number.svg';
// we need to load the css ourselves

// we also need to load the controller and used by the template

// register the provider with the visTypes registry
visTypesRegistry.register(MetricVisProvider);

function MetricVisProvider(Private) {
  const VisType = Private(VisVisTypeProvider);
  const TemplateVisType = Private(TemplateVisTypeTemplateVisTypeProvider);
  const Schemas = Private(VisSchemasProvider);

  // return the visType object, which kibana will use to display and configure new
  // Vis object of this type.
  return new TemplateVisType({
    name: 'metric',
    title: 'Metric',
    image,
    description: 'Display a calculation as a single number',
    category: VisType.CATEGORY.DATA,
    template: metricVisTemplate,
    params: {
      defaults: {
        handleNoResults: true,
        fontSize: 60
      },
      editor: metricVisParamsTemplate
    },
    implementsRenderComplete: true,
    schemas: new Schemas([
      {
        group: 'metrics',
        name: 'metric',
        title: 'Metric',
        min: 1,
        aggFilter: ['!derivative'],
        defaults: [
          { type: 'count', schema: 'metric' }
        ]
      }
    ])
  });
}

// export the provider so that the visType can be required with Private()
export default MetricVisProvider;
