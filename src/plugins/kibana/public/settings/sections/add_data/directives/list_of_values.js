const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');

app.directive('listOfValues', function () {
  return {
    restrict: 'E',
    scope: {
      values: "="
    },
    template: require('../views/list_of_values.html'),
    controller : function ($scope) {
      let app = $scope.app = {
        values: $scope.values
      };

      $scope.delete = function($index) {
        app.values.splice($index, 1);
      }

      $scope.addItem = function() {
        if ($scope.newValue === '')
          return;

        app.values.push($scope.newValue);
        $scope.newValue = '';
      }

      $scope.newValue = '';
    }
  }
});

