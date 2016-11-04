const _ = require('lodash');
const $ = require('jquery');

require('angularSortableView');
require('plugins/timelion/directives/chart/chart');
require('plugins/timelion/directives/timelion_grid');

const app = require('ui/modules').get('apps/timelion', ['angular-sortable-view']);
const html = require('./cells.html');

app.directive('timelionCells', function () {
  return {
    restrict: 'E',
    scope: {
      sheet: '=',
      state: '=',
      transient: '=',
      onSearch: '=',
      onSelect: '=',
    },
    template: html,
    link: function ($scope, $elem) {

      $scope.removeCell = function (index) {
        _.pullAt($scope.state.sheet, index);
        $scope.onSearch();
      };

      $scope.dropCell = function (item, partFrom, partTo, indexFrom, indexTo) {
        $scope.onSelect(indexTo);
        _.move($scope.sheet, indexFrom, indexTo);
      };

    }
  };
});
