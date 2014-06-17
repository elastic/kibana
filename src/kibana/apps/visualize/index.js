define(function (require) {
  require('css!apps/visualize/styles/main.css');

  require('apps/visualize/controllers/editor');
  require('apps/visualize/controllers/wizard');

  require('apps/visualize/directives/canvas');
  require('apps/visualize/directives/visualize');
  require('apps/visualize/directives/config_category');
  require('apps/visualize/directives/search_editor');

  require('routes')
  .when('/visualize', {
    redirectTo: '/visualize/step/1'
  });
});