define(function (require) {
  return function HeatMapVisType(Private) {
    var VislibVisType = Private(require('plugins/vis_types/vislib/_vislib_vis_type'));
    var Schemas = Private(require('plugins/vis_types/_schemas'));
    var heatMapConverter = Private(require('components/agg_response/heatmap/heatmap'));

    return new VislibVisType({
      name: 'heatmap',
      title: 'Heat map',
      icon: 'fa-th',
      params: {
        defaults: {
          addTooltip: true,
          addLegend: true
        }
      },
      responseConverter: heatMapConverter,
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Metric',
          min: 1,
          max: 1,
          defaults: [
            { schema: 'metric', type: 'count' }
          ]
        },
        {
          group: 'buckets',
          name: 'column',
          title: 'Columns',
          aggFilter: ['date_histogram', 'histogram', 'range', 'terms', 'filters', 'significant_terms'],
          min: 0,
          max: 1
        },
        {
          group: 'buckets',
          name: 'row',
          title: 'Rows',
          aggFilter: ['histogram', 'range', 'terms', 'filters', 'significant_terms'],
          min: 0,
          max: 1
        },
        {
          group: 'buckets',
          name: 'split',
          title: 'Split Chart',
          aggFilter: ['date_histogram', 'histogram', 'range', 'terms', 'filters', 'significant_terms'],
          min: 0,
          max: 1
        }
      ])
    });
  };
});
