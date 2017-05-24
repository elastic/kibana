import './waffle_chart.less';
import { CATEGORY } from 'ui/vis/vis_category';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { VisSchemasProvider } from 'ui/vis/editors/default/schemas';
import optionsTemplate from './options_template.html';
import { VisController } from './vis_controller';

function WaffleChart2Provider(Private) {
  const VisFactory = Private(VisFactoryProvider);
  const Schemas = Private(VisSchemasProvider);

  // return the visType object, which kibana will use to display and configure new Vis object of this type.
  return VisFactory.createBaseVisualization({
    name: 'waffle_chart',
    title: 'Waffle Chart',
    icon: 'fa fa-gear',
    description: 'A waffle chart',
    category: CATEGORY.BASIC,
    visualization: VisController,
    visConfig: {
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
        },
        {
          group: 'buckets',
          name: 'split',
          title: 'Waffle colors',
          min: 0,
          max: 1,
          aggFilter: '!geohash_grid'
        }
      ]),
    },
    requestHandler: 'courier',
    responseHandler: 'basic',
  });
}

// register the provider with the visTypes registry
VisTypesRegistryProvider.register(WaffleChart2Provider);

// export the provider so that the visType can be required with Private()
export default WaffleChart2Provider;
