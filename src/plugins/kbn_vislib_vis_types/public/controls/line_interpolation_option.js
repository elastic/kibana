define(function (require) {
  const _ = require('lodash');
  const $ = require('jquery');
  const module = require('ui/modules').get('kibana');

  module.directive('lineInterpolationOption', function ($parse, $compile) {
    return {
      restrict: 'E',
      template: require('plugins/kbn_vislib_vis_types/controls/line_interpolation_option.html'),
      replace: true
    };
  });
});
