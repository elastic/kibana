var _ = require('lodash');
var $ = require('jquery');

require('angularSortableView');
require('plugins/timelion/directives/chart/chart');
require('plugins/timelion/directives/timelion_grid');

var app = require('ui/modules').get('apps/timelion', ['angular-sortable-view']);
var html = require('./fullscreen.html');

app.directive('timelionFullscreen', function () {
  return {
    restrict: 'E',
    scope: {
      expression: '=',
      series: '=',
      state: '=',
      transient: '=',
      onSearch: '=',
    },
    template: html
  };
});
