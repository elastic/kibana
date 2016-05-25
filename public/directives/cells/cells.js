var _ = require('lodash');
var $ = require('jquery');

require('angularSortableView');
require('plugins/timelion/directives/chart/chart');
require('plugins/timelion/directives/timelion_grid');

var app = require('ui/modules').get('apps/timelion', ['angular-sortable-view']);
var html = require('./cells.html');

app.directive('timelionCells', function () {
  return {
    restrict: 'E',
    scope: {
      sheet: '=',
      state: '=',
      onSearch: '=',
      onSelect: '=',
    },
    template: html,
    link: function ($scope, $elem) {
      console.log($scope);

      $scope.removeCell = function (index) {
        console.log('remove', index);
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
