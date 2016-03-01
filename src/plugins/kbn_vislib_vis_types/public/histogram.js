define(function (require) {
  return function HistogramVisType(Private) {
    const VislibVisType = Private(require('ui/vislib_vis_type/VislibVisType'));
    const Schemas = Private(require('ui/Vis/Schemas'));

    return new VislibVisType({
      name: 'histogram',
      title: 'Vertical bar chart',
      icon: 'fa-bar-chart',
      description: 'The goto chart for oh-so-many needs. Great for time and non-time data. Stacked or grouped, ' +
      'exact numbers or percentages. If you are not sure which chart you need, you could do worse than to start here.',
      params: {
        defaults: {
          shareYAxis: true,
          addTooltip: true,
          addLegend: true,
          scale: 'linear',
          mode: 'stacked',
          times: [],
          addTimeMarker: false,
          defaultYExtents: false,
          setYExtents: false,
          yAxis: {}
        },
        scales: ['linear', 'log', 'square root'],
        modes: ['stacked', 'percentage', 'grouped'],
        editor: require('plugins/kbn_vislib_vis_types/editors/histogram.html')
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
          title: 'Split Bars',
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
