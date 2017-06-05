import { VisVisTypeProvider } from 'ui/vis/vis_type';
import { VislibVisTypeVislibVisTypeProvider } from 'ui/vislib_vis_type/vislib_vis_type';
import { VisSchemasProvider } from 'ui/vis/schemas';
import heatmapTemplate from 'plugins/kbn_vislib_vis_types/editors/heatmap.html';
import { vislibColorMaps } from 'ui/vislib/components/color/colormaps';
import image from './images/icon-heatmap.svg';

export default function HeatmapVisType(Private) {
  const VisType = Private(VisVisTypeProvider);
  const VislibVisType = Private(VislibVisTypeVislibVisTypeProvider);
  const Schemas = Private(VisSchemasProvider);

  return new VislibVisType({
    name: 'heatmap',
    title: 'Heat Map',
    image,
    description: 'Shade cells within a matrix',
    category: VisType.CATEGORY.BASIC,
    params: {
      defaults: {
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
      editor: heatmapTemplate
    },
    schemas: new Schemas([
      {
        group: 'metrics',
        name: 'metric',
        title: 'Value',
        min: 1,
        max: 1,
        aggFilter: ['count', 'avg', 'median', 'sum', 'min', 'max', 'cardinality', 'std_dev', 'top_hits'],
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
        name: 'group',
        title: 'Y-Axis',
        min: 0,
        max: 1,
        aggFilter: '!geohash_grid'
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
  });
}
