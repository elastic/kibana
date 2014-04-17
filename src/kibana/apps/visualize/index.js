define(function (require) {
  require('css!./styles/main.css');

  require('./controllers/editor');
  require('./controllers/wizard');

  require('./directives/config_category');
  require('./directives/canvas');
  require('./directives/visualization');

  require('routes')
  .when('/visualize', {
    redirectTo: '/visualize/step/1'
  });
});