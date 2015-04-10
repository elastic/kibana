define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');
  var module = require('modules').get('kibana');

  module.directive('lineInterpolationOption', function ($parse, $compile) {
    return {
      restrict: 'E',
      template: require('text!plugins/vis_types/controls/line_interpolation_option.html'),
      replace: true
    };
  });
});
