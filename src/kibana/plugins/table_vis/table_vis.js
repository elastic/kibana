define(function (require) {
  // we need to load the css ourselves
  require('css!plugins/table_vis/table_vis.css');

  // we also need to load the controller and used by the template
  require('plugins/table_vis/table_vis_controller');

  // require the directives that we use as well
  require('components/agg_table/agg_table');
  require('components/agg_table/agg_table_group');

  // define the TableVisType
  return function TableVisTypeProvider(Private) {
    var TemplateVisType = Private(require('plugins/vis_types/template/template_vis_type'));
    var Schemas = Private(require('plugins/vis_types/_schemas'));

    // define the TableVisController which is used in the template
    // by angular's ng-controller directive

    // return the visType object, which kibana will use to display and configure new
    // Vis object of this type.
    return new TemplateVisType({
      name: 'table',
      title: 'Data table',
      icon: 'fa-table',
      template: require('text!plugins/table_vis/table_vis.html'),
      params: {
        defaults: {
          perPage: 10
        },
        editor: require('text!plugins/table_vis/table_vis_config.html')
      },
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Metric',
          min: 1,
          defaults: [
            { type: 'count', schema: 'metric' }
          ]
        },
        {
          group: 'buckets',
          name: 'bucket',
          title: 'Split Rows'
        },
        {
          group: 'buckets',
          name: 'split',
          title: 'Split Table'
        }
      ])
    });
  };
});