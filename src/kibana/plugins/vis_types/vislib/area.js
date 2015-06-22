define(function (require) {
  return function HistogramVisType(Private) {
    var PointSeriesVisType = Private(require('plugins/vis_types/vislib/_PointSeriesVisType'));
    var Schemas = Private(require('plugins/vis_types/_schemas'));
    var _ = require('lodash');

    return new PointSeriesVisType({
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
          smoothLines: false,
          scale: 'linear',
          interpolate: 'linear',
          mode: 'stacked',
          times: [],
          addTimeMarker: false,
          defaultYExtents: false,
          setYExtents: false,
          yAxis: {}
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
      ]),
      seriesShouldBeInverted: function (vis) {
        /**
         * In overlap mode the series/layers are drawn last to first,
         * so that the first series is the one visible on the top of
         * the layer stack. This works great for data sets where the
         * layers are in visually-ascending order.
         *
         * The default aggregation is "Top N" though, and it is very
         * commonly used. Top N aggs generally create series that are
         * in visually descending order (since the aggregation is
         * usually asking for the metric in descending order).
         *
         * To allow these Top N aggregations to render properyly we detect
         * if the area chart is in overlap mode and if the aggregation
         * responsible for creating the groups/split areas is setup
         * in descending order. In this case, we invert the buckets created
         * by the split agg so that the smaller Top N buckets and
         * rendered in front of the larger ones.
         */
        if (vis.params.mode !== 'overlap') return false;

        var splitAgg = _.first(vis.aggs.bySchemaName.group);
        if (!splitAgg) return false;

        return _.get(splitAgg, ['params', 'order', 'val']) === 'desc';
      }
    });
  };
});
