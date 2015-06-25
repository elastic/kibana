define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');
  var module = require('modules').get('kibana');

  module.directive('vislibBasicOptions', function ($parse, $compile) {
    return {
      restrict: 'E',
      template: require('text!plugins/kbn_vislib_vis_types/controls/vislib_basic_options.html'),
      replace: true
    };
  });
});
