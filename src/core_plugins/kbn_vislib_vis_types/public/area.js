import VislibVisTypeVislibVisTypeProvider from 'ui/vislib_vis_type/vislib_vis_type';
import VisSchemasProvider from 'ui/vis/schemas';
import pointSeriesTemplate from 'plugins/kbn_vislib_vis_types/editors/point_series.html';

export default function PointSeriesVisType(Private) {
  const VislibVisType = Private(VislibVisTypeVislibVisTypeProvider);
  const Schemas = Private(VisSchemasProvider);

  return new VislibVisType({
    name: 'area',
    title: 'Area chart',
    icon: 'fa-area-chart',
    description: 'Great for stacked timelines in which the total of all series is more important ' +
    'than comparing any two or more series. Less useful for assessing the relative change of ' +
    'unrelated data points as changes in a series lower down the stack will have a difficult to gauge ' +
    'effect on the series above it.',
    params: {
      defaults: {
        grid: {
          categoryLines: false,
          style: {
            color: '#eee'
          }
        },
        categoryAxes: [
          {
            id: 'CategoryAxis-1',
            type: 'category',
            position: 'bottom',
            show: true,
            style: {
            },
            scale: {
              type: 'linear'
            },
            labels: {
              show: true,
              truncate: 100
            },
            title: {}
          }
        ],
        valueAxes: [
          {
            id: 'ValueAxis-1',
            name: 'LeftAxis-1',
            type: 'value',
            position: 'left',
            show: true,
            style: {
            },
            scale: {
              type: 'linear',
              mode: 'normal'
            },
            labels: {
              show: true,
              rotate: 0,
              filter: false,
              truncate: 100
            },
            title: {}
          }
        ],
        seriesParams: [{
          show: 'true',
          type: 'area',
          mode: 'stacked',
          data: {
            label: 'Count'
          },
          drawLinesBetweenPoints: true,
          showCircles: true,
          interpolate: 'linear',
          valueAxis: 'ValueAxis-1'
        }],
        addTooltip: true,
        addLegend: true,
        legendPosition: 'right',
        showCircles: true,
        interpolate: 'linear',
        scale: 'linear',
        drawLinesBetweenPoints: true,
        radiusRatio: 9,
        times: [],
        addTimeMarker: false,
        defaultYExtents: false,
        setYExtents: false
      },
      positions: ['top', 'left', 'right', 'bottom'],
      chartTypes: ['line', 'area', 'histogram'],
      axisModes: ['normal', 'percentage', 'wiggle', 'silhouette'],
      scaleTypes: ['linear', 'log', 'square root'],
      chartModes: ['normal', 'stacked'],
      interpolationModes: [{
        value: 'linear',
        text: 'straight',
      }, {
        value: 'cardinal',
        text: 'smoothed',
      }, {
        value: 'step-after',
        text: 'stepped',
      }],
      editor: pointSeriesTemplate,
      optionTabs: [
        { name: 'options', title: 'Settings', editor: pointSeriesTemplate },
        {
          name: 'advanced',
          title: 'Advanced',
          editor: '<div><vislib-series></vislib-series><vislib-value-axes>' +
          '</vislib-value-axes><vislib-category-axis></vislib-category-axis></div>'
        },
      ],
    },
    schemas: new Schemas([
      {
        group: 'metrics',
        name: 'metric',
        title: 'Y-Axis',
        min: 1,
        defaults: [
          { schema: 'metric', type: 'count' }
        ]
      },
      {
        group: 'metrics',
        name: 'radius',
        title: 'Dot Size',
        min: 0,
        max: 1,
        aggFilter: ['count', 'avg', 'sum', 'min', 'max', 'cardinality']
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
        title: 'Split Series',
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
