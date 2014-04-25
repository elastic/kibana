define(function (require) {
  require('css!./styles/main.css');

  require('./controllers/editor');
  require('./controllers/wizard');

  require('./directives/canvas');
  require('./directives/visualize');
  require('./directives/config_category');

  require('routes')
  .when('/visualize', {
    redirectTo: '/visualize/step/1'
  });
});