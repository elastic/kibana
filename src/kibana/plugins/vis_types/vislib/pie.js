define(function (require) {
  return function HistogramVisType(Private) {
    var VislibVisType = Private(require('plugins/vis_types/vislib/_vislib_vis_type'));
    var Schemas = Private(require('plugins/vis_types/_schemas'));
    var PieConverter = Private(require('plugins/vis_types/vislib/converters/pie'));

    return new VislibVisType({
      name: 'pie',
      title: 'Pie chart',
      icon: 'fa-pie-chart',
      params: {
        defaults: {
          shareYAxis: true,
          addTooltip: true,
          addLegend: true,
        },
        editor: require('text!plugins/vis_types/vislib/editors/basic.html')
      },
      responseConverter: PieConverter,
      hierarchicalData: true,
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Slice Size',
          min: 1,
          max: 1,
          aggFilter: ['sum', 'count'],
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
          max: Infinity
        },
        {
          group: 'buckets',
          name: 'split',
          icon: 'fa fa-th',
          title: 'Split Chart',
          mustBeFirst: true,
          min: 0,
          max: 1
        }
      ])
    });
  };
});
