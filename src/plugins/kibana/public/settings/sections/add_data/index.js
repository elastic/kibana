define(function (require) {
  require('./directives/kbn_settings_add_data');
  require('./directives/pipeline_setup');
  require('./directives/source_data');
  require('./directives/source_data_new');
  require('./directives/pipeline_output');
  require('./styles/_add_data.less');

  require('ui/routes')
  .when('/settings/add_data', {
    template: require('plugins/kibana/settings/sections/add_data/index.html')
  });

  return {
    order: 1,
    name: 'add_data',
    display: 'Add Data',
    url: '#/settings/add_data'
  };
});
