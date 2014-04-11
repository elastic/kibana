define(function (require) {
  require('css!./styles/main.css');

  require('./controllers/wizard');
  require('./controllers/editor');

  require('./directives/config_category');
  require('./directives/canvas');
  require('./directives/visualization');

  require('routes')
  .when('/visualize', {
    template: require('text!./wizard.html')
  })
  .when('/visualize/:type/:id?', {
    template: require('text!./editor.html'),
    resolve: {
      vis: function ($route, savedVis) {
        return savedVis.get($route.current.params.type, $route.current.params.id);
      }
    }
  });
});