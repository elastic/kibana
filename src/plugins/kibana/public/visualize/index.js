define(function (require) {
  require('css!plugins/kibana/visualize/styles/main.css');

  require('plugins/kibana/visualize/editor/editor');
  require('plugins/kibana/visualize/wizard/wizard');

  require('routes')
  .when('/visualize', {
    redirectTo: '/visualize/step/1'
  });
});
