import { CATEGORY } from 'ui/vis/vis_category';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { WaffleVisualization } from './waffle_visualization';
import { VisSchemasProvider } from 'ui/vis/editors/default/schemas';
import image from './icon-heatmap.svg';
import './waffle.less';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';


VisTypesRegistryProvider.register(function TileMapVisType(Private) {

  const Schemas = Private(VisSchemasProvider);
  const VisFactory = Private(VisFactoryProvider);

  return VisFactory.createBaseVisualization({
    name: 'waffle_vis',
    title: 'Waffle Vis',
    image,
    description: 'Waffle visualization',
    category: CATEGORY.BASIC,
    visConfig: {
      defaults: {}
    },
    responseHandler: 'basic',
    implementsRenderComplete: true,
    visualization: WaffleVisualization,
    editorConfig: {
      collections: {},
      optionsTemplate: `<div>Ma options</div>`,
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Squares',
          min: 1,
          max: 1,
          aggFilter: ['!geo_centroid'],
          defaults: [
            { schema: 'metric', type: 'count' }
          ]
        },
        {
          group: 'buckets',
          name: 'split',
          title: 'Split Chart',
          min: 0,
          max: 1,
          aggFilter: '!geohash_grid'
        }
      ])
    }
  });
});
