import _ from 'lodash';
import $ from 'jquery';
import 'ui/directives/inequality';
define(function (require) {
  const module = require('ui/modules').get('kibana');

  module.directive('pointSeriesOptions', function ($parse, $compile) {
    return {
      restrict: 'E',
      template: require('plugins/kbn_vislib_vis_types/controls/point_series_options.html'),
      replace: true
    };
  });
});
