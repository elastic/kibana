define(function (require) {
  require('css!./styles/main.css');

  require('./controllers/editor');

  require('./directives/config_category');
  require('./directives/canvas');
  require('./directives/visualization');

  require('routes')
  .when('/visualize', {
    redirectTo: '/visualize/histogram'
  })
  .when('/visualize/:type/:id?', {
    template: require('text!./index.html'),
    resolve: {
      vis: function ($route, savedVisualizations) {
        return savedVisualizations.get($route.current.params.type, $route.current.params.id);
      }
    }
  });
});