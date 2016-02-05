define(function (require) {
  const _ = require('lodash');
  const $ = require('jquery');
  const module = require('ui/modules').get('kibana');

  module.directive('vislibBasicOptions', function ($parse, $compile) {
    return {
      restrict: 'E',
      template: require('plugins/kbn_vislib_vis_types/controls/vislib_basic_options.html'),
      replace: true
    };
  });
});
