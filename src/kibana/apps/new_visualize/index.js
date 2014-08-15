define(function (require) {
  require('css!apps/visualize/styles/main.css');

  require('apps/visualize/editor/editor');

  require('routes')
  .when('/new_visualize', {
    redirectTo: '/new_visualize/edit/Requests'
  });
});