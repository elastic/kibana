define(function (require) {
  require('css!./styles/main.css');

  require('./controllers/visualize');

  require('./directives/config_category');
  require('./directives/canvas');
  require('./directives/visualization');
});