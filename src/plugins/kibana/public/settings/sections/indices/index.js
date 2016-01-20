define(function (require) {
  var _ = require('lodash');

  require('plugins/kibana/settings/sections/indices/directives/kbn_settings_indices');
  require('plugins/kibana/settings/sections/indices/_create');
  require('plugins/kibana/settings/sections/indices/filebeat/index');
  require('plugins/kibana/settings/sections/indices/_edit');
  require('plugins/kibana/settings/sections/indices/_field_editor');

  // add a dependency to all of the subsection routes
  require('ui/routes')
  .defaults(/settings\/indices/, {
    resolve: {
      indexPatternIds: function (courier) {
        return courier.indexPatterns.getIds();
      }
    }
  });

  require('ui/routes')
    .when('/settings/indices', {
      template: require('plugins/kibana/settings/sections/indices/index.html')
    });

  return {
    name: 'indices',
    display: 'Indices',
    url: '#/settings/indices'
  };
});
