define(function (require) {
  return function HistogramVisType(Private) {
    const VislibVisType = Private(require('ui/vislib_vis_type/VislibVisType'));
    const Schemas = Private(require('ui/Vis/Schemas'));

    return new VislibVisType({
      name: 'pie',
      title: 'Pie chart',
      icon: 'fa-pie-chart',
      description: 'Pie charts are ideal for displaying the parts of some whole. For example, sales percentages by department.' +
       'Pro Tip: Pie charts are best used sparingly, and with no more than 7 slices per pie.',
      params: {
        defaults: {
          shareYAxis: true,
          addTooltip: true,
          addLegend: true,
          isDonut: false
        },
        editor: require('plugins/kbn_vislib_vis_types/editors/pie.html')
      },
      responseConverter: false,
      hierarchicalData: true,
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Slice Size',
          min: 1,
          max: 1,
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
