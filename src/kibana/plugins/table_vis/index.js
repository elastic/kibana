define(function (require) {
  function TableVisProvider(Private) {
    var TemplateVisType = Private(require('plugins/vis_types/template/template_vis_type'));
    var Schemas = Private(require('plugins/vis_types/_schemas'));

    require('plugins/table_vis/table_vis');

    return new TemplateVisType({
      name: 'table',
      title: 'Data Table',
      icon: 'fa-table',
      template: require('text!plugins/table_vis/table_vis.html'),
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Metric'
        },
        {
          group: 'buckets',
          name: 'bucket',
          title: 'Split Column'
        },
        {
          group: 'buckets',
          name: 'split',
          title: 'Split Table'
        }
      ])
    });
  }

  require('registry/vis_types').register(TableVisProvider);
});