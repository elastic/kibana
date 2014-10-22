define(function (require) {
  return function HistogramVisType(Private) {
    var TemplateVisType = Private(require('plugins/vis_types/template/_template_vis_type'));
    var Schemas = Private(require('plugins/vis_types/_schemas'));

    return new TemplateVisType({
      name: 'table',
      title: 'Data Table',
      icon: 'fa-table',
      template: require('text!plugins/vis_types/template/table.html'),
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metrics',
          title: 'Metric'
        },
        {
          group: 'buckets',
          name: 'buckets',
          title: 'Bucket'
        }
      ])
    });
  };
});