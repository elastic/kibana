const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');

app.directive('processorHeader', function () {
  return {
    restrict: 'E',
    scope: {
      processor: '=',
      field: '=',
      collapsed: '=',
      description: '=',
      removeFn: '&'
    },
    template: require('../views/processor_header.html'),
    controller: function ($scope) {
      $scope.moveUp = function() {
        console.log('Move Up');
      }

      $scope.moveDown = function() {
        console.log('Move Down');
      }

      $scope.remove = function() {
        //console.log($scope.removeFn);
        $scope.removeFn($scope.processor);
      }
    }
  };
});
