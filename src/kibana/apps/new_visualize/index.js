define(function (require) {
  require('css!apps/visualize/styles/main.css');

  require('apps/visualize/editor/editor');
  require('apps/visualize/wizard/wizard');

  require('routes')
  .when('/new_visualize', {
    redirectTo: '/new_visualize/step/1'
  });
});