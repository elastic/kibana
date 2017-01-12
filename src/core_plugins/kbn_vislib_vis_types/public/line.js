import VislibVisTypeVislibVisTypeProvider from 'ui/vislib_vis_type/vislib_vis_type';
import VisSchemasProvider from 'ui/vis/schemas';
import pointSeriesTemplate from 'plugins/kbn_vislib_vis_types/editors/point_series.html';

export default function PointSeriesVisType(Private) {
  const VislibVisType = Private(VislibVisTypeVislibVisTypeProvider);
  const Schemas = Private(VisSchemasProvider);

  return new VislibVisType({
    name: 'line',
    title: 'Line chart',
    icon: 'fa-line-chart',
    description: 'Often the best chart for high density time series. Great for comparing one series to another. ' +
    'Be careful with sparse sets as the connection between points can be misleading.',
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
            },
            title: {}
          }
        ],
        valueAxes: [
          {
            id: 'ValueAxis-1',
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
        seriesParams: [],
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
        { name: 'series', title: 'Series', editor: '<vislib-series></vislib-series>' },
        {
          name: 'axes',
          title: 'Axes',
          editor: '<div><vislib-value-axes></vislib-value-axes><vislib-category-axis></vislib-category-axis></div>'
        },
        { name: 'options', title: 'Settings', editor: pointSeriesTemplate },
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
        aggFilter: ['count', 'avg', 'sum', 'min', 'max', 'cardinality', 'top_hits']
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
