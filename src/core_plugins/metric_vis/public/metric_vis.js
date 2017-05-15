import 'plugins/metric_vis/metric_vis.less';
import 'plugins/metric_vis/metric_vis_controller';
import { VisTypeFactoryProvider } from 'ui/vis/vis_type';
import { AngularVisTypeFactoryProvider } from 'ui/vis/vis_types/angular_vis_type';
import { VisSchemasProvider } from 'ui/vis/schemas';
import metricVisTemplate from 'plugins/metric_vis/metric_vis.html';
import metricVisParamsTemplate from 'plugins/metric_vis/metric_vis_params.html';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import image from './images/icon-number.svg';
// we need to load the css ourselves

// we also need to load the controller and used by the template

// register the provider with the visTypes registry
VisTypesRegistryProvider.register(MetricVisProvider);

function MetricVisProvider(Private) {
  const VisTypeFactory = Private(VisTypeFactoryProvider);
  const AngularVisTypeFactory = Private(AngularVisTypeFactoryProvider);
  const Schemas = Private(VisSchemasProvider);

  // return the visType object, which kibana will use to display and configure new
  // Vis object of this type.
  return new AngularVisTypeFactory({
    name: 'metric',
    title: 'Metric',
    image,
    description: 'Display a calculation as a single number',
    category: VisTypeFactory.CATEGORY.DATA,
    visConfig: {
      defaults: {
        handleNoResults: true,
        fontSize: 60
      },
      template: metricVisTemplate,
    },
    editorConfig: {
      optionsTemplate: metricVisParamsTemplate
    },
    implementsRenderComplete: true,
    schemas: new Schemas([
      {
        group: 'metrics',
        name: 'metric',
        title: 'Metric',
        min: 1,
        aggFilter: ['!derivative', '!geo_centroid'],
        defaults: [
          { type: 'count', schema: 'metric' }
        ]
      }
    ])
  });
}

// export the provider so that the visType can be required with Private()
export default MetricVisProvider;
