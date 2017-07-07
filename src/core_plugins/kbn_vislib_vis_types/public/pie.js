import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { VisSchemasProvider } from 'ui/vis/editors/default/schemas';
import { CATEGORY } from 'ui/vis/vis_category';
import pieTemplate from 'plugins/kbn_vislib_vis_types/editors/pie.html';
import image from './images/icon-pie.svg';

export default function HistogramVisType(Private) {
  const VisFactory = Private(VisFactoryProvider);
  const Schemas = Private(VisSchemasProvider);

  return VisFactory.createVislibVisualization({
    name: 'pie',
    title: 'Pie',
    image,
    description: 'Compare parts of a whole',
    category: CATEGORY.BASIC,
    visConfig: {
      defaults: {
        type: 'pie',
        addTooltip: true,
        addLegend: true,
        legendPosition: 'right',
        isDonut: false
      },
    },
    editorConfig: {
      collections: {
        legendPositions: [{
          value: 'left',
          text: 'left',
        }, {
          value: 'right',
          text: 'right',
        }, {
          value: 'top',
          text: 'top',
        }, {
          value: 'bottom',
          text: 'bottom',
        }],
      },
      optionsTemplate: pieTemplate,
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Slice Size',
          min: 1,
          max: 1,
          aggFilter: ['sum', 'count', 'cardinality', 'top_hits'],
          defaults: [
            { schema: 'metric', type: 'count' }
          ]
        },
        {
          group: 'buckets',
          name: 'segment',
          icon: 'fa fa-scissors',
          title: 'Split Slices',
          min: 0,
          max: Infinity,
          aggFilter: '!geohash_grid'
        },
        {
          group: 'buckets',
          name: 'split',
          icon: 'fa fa-th',
          title: 'Split Chart',
          mustBeFirst: true,
          min: 0,
          max: 1,
          aggFilter: '!geohash_grid'
        }
      ])
    },
    hierarchicalData: true,
    implementsRenderComplete: true
  });
}
