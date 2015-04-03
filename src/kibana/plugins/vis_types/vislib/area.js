define(function (require) {
  return function HistogramVisType(Private) {
    var VislibVisType = Private(require('plugins/vis_types/vislib/_vislib_vis_type'));
    var Schemas = Private(require('plugins/vis_types/_schemas'));

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
          shareYAxis: true,
          addTooltip: true,
          addLegend: true,
          scale: 'linear',
          mode: 'stacked',
          defaultYExtents: false,
          times: [],
          addTimeMarker: false
        },
        scales: ['linear', 'log', 'square root'],
        modes: ['stacked', 'overlap', 'percentage', 'wiggle', 'silhouette'],
        editor: require('text!plugins/vis_types/vislib/editors/area.html')
      },
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Y-Axis',
          min: 1,
          aggFilter: '!std_dev',
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
          title: 'Split Area',
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
