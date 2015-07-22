define(function (require) {
  require('plugins/kibana/visualize/styles/main.less');

  require('plugins/kibana/visualize/editor/editor');
  require('plugins/kibana/visualize/wizard/wizard');

  require('ui/routes')
  .when('/visualize', {
    redirectTo: '/visualize/step/1'
  });
});
