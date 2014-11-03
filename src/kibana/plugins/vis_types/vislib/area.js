define(function (require) {
  return function HistogramVisType(Private) {
    var VislibVisType = Private(require('plugins/vis_types/vislib/_vislib_vis_type'));
    var Schemas = Private(require('plugins/vis_types/_schemas'));
    var editor = require('plugins/vis_types/vislib/_vislib_editor');

    var name = 'area';

    return new VislibVisType({
      name: name,
      title: 'Area chart',
      icon: 'fa-area-chart',
      params: {
        defaults: {
          shareYAxis: true,
          addTooltip: true,
          addLegend: true
        },
        editor: editor.create(name)
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
          title: 'Split Area',
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
