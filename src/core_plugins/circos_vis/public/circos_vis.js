import './circos_vis.less';
import './vis_options';
import { CATEGORY } from 'ui/vis/vis_category';
import { VisSchemasProvider } from 'ui/vis/editors/default/schemas';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { CircosVisController } from './vis_controller';
import { CircosResponseHandlerProvider } from './response_handler';

function Test1Provider(Private) {
  const VisFactory = Private(VisFactoryProvider);
  const Schemas = Private(VisSchemasProvider);
  const responseHandler = Private(CircosResponseHandlerProvider).handler;

  // return the visType object, which kibana will use to display and configure new Vis object of this type.
  return VisFactory.createBaseVisualization({
    name: 'circos_vis',
    title: 'Circos',
    icon: 'fa fa-gear',
    description: 'Circos visualization',
    category: CATEGORY.OTHER,
    visualization: CircosVisController,
    visConfig: {
      defaults: {
        seriesParams: [],
        layout: {
          gap: 0,
          showLabels: true,
        }
      },
    },
    editorConfig: {
      collections: {
        chartTypes: ['heatmap', 'histogram', 'line', 'scatter'],
        colorSchemas: ['OrRd', 'GnBu', 'BuGn', 'YlGn'],
      },
      optionsTemplate: '<circos-vis-options></circos-vis-options>',
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Y-Axis',
          min: 1,
          aggFilter: ['!geo_centroid'],
          defaults: [
            { schema: 'metric', type: 'count' }
          ]
        },
        {
          group: 'buckets',
          name: 'segment',
          title: 'X-Axis',
          min: 0,
          max: 1,
          aggFilter: '!geohash_grid'
        },
        {
          group: 'buckets',
          name: 'split',
          title: 'Split Circle',
          min: 0,
          max: 1,
          aggFilter: '!geohash_grid'
        }
      ])
    },
    requestHandler: 'courier',
    responseHandler: responseHandler,
  });
}

// register the provider with the visTypes registry
VisTypesRegistryProvider.register(Test1Provider);

// export the provider so that the visType can be required with Private()
export default Test1Provider;
