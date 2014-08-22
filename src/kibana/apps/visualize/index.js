define(function (require) {
  require('css!apps/visualize/styles/main.css');

  require('apps/visualize/editor/editor');
  require('apps/visualize/wizard/wizard');

  require('routes')
  .when('/visualize', {
    redirectTo: '/visualize/step/1'
  });
});