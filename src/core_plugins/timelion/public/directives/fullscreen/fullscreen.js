const _ = require('lodash');
const $ = require('jquery');

require('angular-sortable-view');
require('plugins/timelion/directives/chart/chart');
require('plugins/timelion/directives/timelion_grid');

const app = require('ui/modules').get('apps/timelion', ['angular-sortable-view']);
const html = require('./fullscreen.html');

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
