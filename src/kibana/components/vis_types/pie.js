define(function (require) {
  return function HistogramVisType(Private) {
    var VisType = Private(require('components/vis_types/_vis_type'));
    var Schemas = Private(require('components/vis_types/_schemas'));
    var PieConverter = Private(require('components/vis_types/converters/pie'));

    return new VisType({
      name: 'pie',
      icon: 'icon-chart-bar',
      vislibParams: {
        addEvents: true,
        addTooltip: true,
        addLegend: true
      },
      responseConverter: PieConverter,
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Slice Size',
          min: 1,
          max: 1
        },
        {
          group: 'buckets',
          name: 'segment',
          icon: 'fa fa-scissors',
          title: 'Slices',
          min: 0,
          max: 1
        },
        {
          group: 'buckets',
          name: 'split',
          icon: 'fa fa-th',
          title: 'Rows & Columns',
          min: 0,
          max: 1
        }
      ])
    });
  };
});