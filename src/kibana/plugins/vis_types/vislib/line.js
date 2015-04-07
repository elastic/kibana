define(function (require) {
  return function HistogramVisType(Private) {
    var VislibVisType = Private(require('plugins/vis_types/vislib/_vislib_vis_type'));
    var Schemas = Private(require('plugins/vis_types/_schemas'));

    return new VislibVisType({
      name: 'line',
      title: 'Line chart',
      icon: 'fa-line-chart',
      description: 'Often the best chart for high density time series. Great for comparing one series to another. ' +
        'Be careful with sparse sets as the connection between points can be misleading.',
      params: {
        defaults: {
          shareYAxis: true,
          addTooltip: true,
          addLegend: true,
          showCircles: true,
          smoothLines: false,
          interpolate: 'linear',
          drawLinesBetweenPoints: true,
          radiusRatio: 9,
          scale: 'linear',
          defaultYExtents: false
        },
        scales: ['linear', 'log', 'square root'],
        editor: require('text!plugins/vis_types/vislib/editors/line.html')
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
          title: 'Split Lines',
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
});
