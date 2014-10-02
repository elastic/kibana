define(function (require) {
  return function HistogramVisType(Private) {
    var VisType = Private(require('components/vis_types/_vis_type'));
    var Schemas = Private(require('components/vis_types/_schemas'));

    return new VisType({
      name: 'histogram',
      title: 'Vertical bar chart',
      icon: 'fa-bar-chart',
      vislibParams: {
        shareYAxis: true,
        addTooltip: true,
        addLegend: true,
      },
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Y-Axis',
          min: 1,
          max: 1,
          defaults: [
            { schema: 'metric', type: 'count' }
          ]
        },
        {
          group: 'buckets',
          name: 'segment',
          title: 'X-Axis',
          min: 0,
          max: 1
        },
        {
          group: 'buckets',
          name: 'group',
          title: 'Split Bars',
          min: 0,
          max: 1
        },
        {
          group: 'buckets',
          name: 'split',
          title: 'Split Chart',
          min: 0,
          max: 1
        }
      ])
    });
  };
});
