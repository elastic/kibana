import 'plugins/waffle_chart/waffle_chart.less';
import { CATEGORY } from 'ui/vis/vis_category';
import 'plugins/waffle_chart/vis_controller';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { VisSchemasProvider } from 'ui/vis/editors/default/schemas';
import optionsTemplate from 'plugins/waffle_chart/options_template.html';
import visTemplate from 'plugins/waffle_chart/vis_template.html';

function WaffleChartProvider(Private) {
  const VisFactory = Private(VisFactoryProvider);
  const Schemas = Private(VisSchemasProvider);

  // return the visType object, which kibana will use to display and configure new Vis object of this type.
  return VisFactory.createAngularVisualization({
    name: 'waffle_chart',
    title: 'Waffle Chart',
    icon: 'fa fa-gear',
    description: 'a waffle chart',
    category: CATEGORY.OTHER,
    visConfig: {
      defaults: {
        // add default parameters
        fontSize: '50'
      },
      template: visTemplate,
    },
    editor: 'default',
    editorConfig: {
      optionsTemplate: optionsTemplate,
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
      ]),
    },
    requestHandler: 'courier',
    responseHandler: 'none',
  });
}

// register the provider with the visTypes registry
VisTypesRegistryProvider.register(WaffleChartProvider);

// export the provider so that the visType can be required with Private()
export default WaffleChartProvider;
