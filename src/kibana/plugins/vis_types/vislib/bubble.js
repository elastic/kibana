define(function (require) {
  return function HistogramVisType(Private) {
    var VislibVisType = Private(require('plugins/vis_types/vislib/_vislib_vis_type'));
    var Schemas = Private(require('plugins/vis_types/_schemas'));

    return new VislibVisType({
      name: 'bubble',
      title: 'Bubble chart',
      icon: 'fa-line-chart',
      description: 'Need three or more aggregation metrics for your visualization, choose me!',
      params: {
        defaults: {
          shareYAxis: true,
          drawLinesBetweenPoints: false,
          addTooltip: true,
          addLegend: true,
          defaultYExtents: false
        },
        editor: require('text!plugins/vis_types/vislib/editors/basic.html')
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
          title: 'Dot size',
          min: 0,
          max: 1
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
