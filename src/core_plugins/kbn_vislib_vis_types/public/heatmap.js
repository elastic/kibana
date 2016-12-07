import VislibVisTypeVislibVisTypeProvider from 'ui/vislib_vis_type/vislib_vis_type';
import VisSchemasProvider from 'ui/vis/schemas';
import heatmapTemplate from 'plugins/kbn_vislib_vis_types/editors/heatmap.html';

export default function HeatmapVisType(Private) {
  const VislibVisType = Private(VislibVisTypeVislibVisTypeProvider);
  const Schemas = Private(VisSchemasProvider);

  return new VislibVisType({
    name: 'heatmap',
    title: 'Heatmap chart',
    icon: 'fa-barcode',
    description: 'A heat map is a graphical representation of data' +
    ' where the individual values contained in a matrix are represented as colors. ',
    params: {
      defaults: {
        addTooltip: true,
        addLegend: true,
        enableHover: false,
        legendPosition: 'right',
        scale: 'linear',
        times: [],
        addTimeMarker: false,
        defaultYExtents: false,
        setYExtents: false,
        colorsNumber: 4,
        colorSchema: 'yellow to red',
        setColorRange: false,
        colorsRange: [],
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
      colorSchemas: ['yellow to red', 'reds', 'greens', 'blues', 'custom'],
      editor: heatmapTemplate
    },
    schemas: new Schemas([
      {
        group: 'metrics',
        name: 'metric',
        title: 'Value',
        min: 1,
        max: 1,
        aggFilter: ['count', 'avg', 'median', 'sum', 'min', 'max', 'cardinality', 'std_dev'],
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
};
