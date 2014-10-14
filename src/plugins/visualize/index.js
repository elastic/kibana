define(function (require) {
  require('css!plugins/visualize/styles/main.css');

  require('plugins/visualize/editor/editor');
  require('plugins/visualize/wizard/wizard');

  require('routes')
  .when('/visualize', {
    redirectTo: '/visualize/step/1'
  });
});