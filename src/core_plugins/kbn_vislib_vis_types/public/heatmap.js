import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { VisSchemasProvider } from 'ui/vis/editors/default/schemas';
import { CATEGORY } from 'ui/vis/vis_category';
import heatmapTemplate from 'plugins/kbn_vislib_vis_types/editors/heatmap.html';
import { vislibColorMaps } from 'ui/vislib/components/color/colormaps';
import { AggTypesIndexProvider } from 'ui/agg_types';
import { AggregationsProvider } from 'ui/vis/aggregations';
import image from './images/icon-heatmap.svg';

export default function HeatmapVisType(Private) {
  const VisFactory = Private(VisFactoryProvider);
  const Schemas = Private(VisSchemasProvider);
  const AggTypes = Private(AggTypesIndexProvider);
  const AGGREGATIONS = Private(AggregationsProvider);

  return VisFactory.createVislibVisualization({
    name: 'heatmap',
    title: 'Heat Map',
    image,
    description: 'Shade cells within a matrix',
    category: CATEGORY.BASIC,
    visConfig: {
      defaults: {
        type: 'heatmap',
        addTooltip: true,
        addLegend: true,
        enableHover: false,
        legendPosition: 'right',
        times: [],
        colorsNumber: 4,
        colorSchema: 'Greens',
        setColorRange: false,
        colorsRange: [],
        invertColors: false,
        percentageMode: false,
        valueAxes: [{
          show: false,
          id: 'ValueAxis-1',
          type: 'value',
          scale: {
            type: 'linear',
            defaultYExtents: false,
          },
          labels: {
            show: false,
            rotate: 0,
            color: '#555'
          }
        }]
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
        scales: ['linear', 'log', 'square root'],
        colorSchemas: Object.keys(vislibColorMaps),
      },
      optionsTemplate: heatmapTemplate,
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Value',
          min: 1,
          max: 1,
          aggFilter: AGGREGATIONS.SIMPLE_METRICS,
          defaults: [
            { schema: 'metric', type: AggTypes.byName.count.name }
          ]
        },
        {
          group: 'buckets',
          name: 'segment',
          title: 'X-Axis',
          min: 0,
          max: 1,
          aggFilter: AGGREGATIONS.DEFAULT_BUCKETS
        },
        {
          group: 'buckets',
          name: 'group',
          title: 'Y-Axis',
          min: 0,
          max: 1,
          aggFilter: AGGREGATIONS.DEFAULT_BUCKETS
        },
        {
          group: 'buckets',
          name: 'split',
          title: 'Split Chart',
          min: 0,
          max: 1,
          aggFilter: AGGREGATIONS.DEFAULT_BUCKETS
        }
      ])
    }

  });
}
