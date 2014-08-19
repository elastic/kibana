define(function (require) {
  return function HistogramVisType(Private) {
    var VisType = Private(require('components/vis_types/_vis_type'));
    var Schemas = Private(require('components/vis_types/_schemas'));

    return new VisType({
      name: 'pie',
      icon: 'icon-chart-bar',
      vislibParams: {
        addTooltip: true,
        addLegend: true
      },
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
          title: 'Slices',
          min: 0,
          max: 1
        },
        {
          group: 'buckets',
          name: 'split',
          title: 'Splits',
          min: 0,
          max: 1
        }
      ])
    });
  };
});