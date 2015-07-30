define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');
  var module = require('ui/modules').get('kibana');
  require('ui/directives/inequality');

  module.directive('pointSeriesOptions', function ($parse, $compile) {
    return {
      restrict: 'E',
      template: require('plugins/kbn_vislib_vis_types/controls/point_series_options.html'),
      replace: true
    };
  });
});
