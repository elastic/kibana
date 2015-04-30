define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');
  var module = require('modules').get('kibana');

  module.directive('pointSeriesOptions', function ($parse, $compile) {
    return {
      restrict: 'E',
      template: require('text!plugins/vis_types/controls/point_series_options.html'),
      replace: true
    };
  });
});
