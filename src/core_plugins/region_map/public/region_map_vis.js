import './region_map.less';
import './region_map_controller';
import './region_map_vis_params';
import regionTemplate from './region_map_controller.html';
import image from './images/icon-vector-map.svg';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { CATEGORY } from 'ui/vis/vis_category';
import { VisSchemasProvider } from 'ui/vis/editors/default/schemas';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { truncatedColorMaps } from 'ui/vislib/components/color/truncated_colormaps';

VisTypesRegistryProvider.register(function RegionMapProvider(Private, regionmapsConfig) {
  const VisFactory = Private(VisFactoryProvider);
  const Schemas = Private(VisSchemasProvider);

  const vectorLayers = regionmapsConfig.layers;
  const selectedLayer = vectorLayers[0];
  const selectedJoinField = selectedLayer ? vectorLayers[0].fields[0] : null;

  return VisFactory.createAngularVisualization({
    name: 'region_map',
    title: 'Region Map',
    implementsRenderComplete: true,
    description: 'Show metrics on a thematic map. Use one of the provide base maps, or add your own. ' +
    'Darker colors represent higher values.',
    category: CATEGORY.MAP,
    image,
    visConfig: {
      defaults: {
        legendPosition: 'bottomright',
        addTooltip: true,
        colorSchema: 'Yellow to Red',
        selectedLayer: selectedLayer,
        selectedJoinField: selectedJoinField
      },
      template: regionTemplate,
    },
    editorConfig: {
      optionsTemplate: '<region_map-vis-params></region_map-vis-params>',
      collections: {
        legendPositions: [{
          value: 'bottomleft',
          text: 'bottom left',
        }, {
          value: 'bottomright',
          text: 'bottom right',
        }, {
          value: 'topleft',
          text: 'top left',
        }, {
          value: 'topright',
          text: 'top right',
        }],
        colorSchemas: Object.keys(truncatedColorMaps),
        vectorLayers: vectorLayers,
      },
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Value',
          min: 1,
          max: 1,
          aggFilter: ['count', 'avg', 'sum', 'min', 'max', 'cardinality', 'top_hits',
            'sum_bucket', 'min_bucket', 'max_bucket', 'avg_bucket'],
          defaults: [
            { schema: 'metric', type: 'count' }
          ]
        },
        {
          group: 'buckets',
          name: 'segment',
          icon: 'fa fa-globe',
          title: 'shape field',
          min: 1,
          max: 1,
          aggFilter: ['terms']
        }
      ])
    }
  });
});


