define(function (require) {
  return function HistogramVisType(Private) {
    var VislibVisType = Private(require('ui/vislib_vis_type/VislibVisType'));
    var Schemas = Private(require('ui/Vis/Schemas'));
    var sankeyBuilder = Private(require('ui/agg_response/sankey/sankey'));

    return new VislibVisType({
      name: 'sankey',
      title: 'Sankey chart',
      icon: 'fa-sankey-chart',
      description: 'Sankey charts are ideal for displaying the parts of some whole. For example, sales percentages by department.' +
       'Pro Tip: Sankey charts are best used sparingly, and with no more than 7 slices per sankey.',
      params: {
        defaults: {
          shareYAxis: false,
          isDonut: false
        },
        editor: require('plugins/kbn_vislib_vis_types/editors/sankey.html')
      },
      sankeyConverter: sankeyBuilder,
      hierarchicalData: false,
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Slice Size',
          min: 1,
          aggFilter: ['sum', 'count', 'cardinality'],
          defaults: [
            { schema: 'metric', type: 'count' }
          ]
        },
        {
          group: 'buckets',
          name: 'segment',
          icon: 'fa fa-scissors',
          title: 'Split Slices',
          min: 0,
          max: Infinity,
          aggFilter: '!geohash_grid'
        },
        {
          group: 'buckets',
          name: 'split',
          icon: 'fa fa-th',
          title: 'Split Chart',
          mustBeFirst: true,
          min: 0,
          max: 1,
          aggFilter: '!geohash_grid'
        }
      ])
    });
  };
});
