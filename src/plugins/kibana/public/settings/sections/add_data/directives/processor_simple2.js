const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');
const objectManager = require('../lib/object_manager');
require('./processor_header');

app.directive('processorSimple2', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_simple2.html'),
    controller: function ($scope, debounce, Promise, $timeout) {
      $scope.setParent = function(parent) {
        //console.log($scope.processor.processorId, 'setParent', parent);

        let oldParent = $scope.parent;
        $scope.parent = parent;

        return (oldParent !== parent);
      }
    }
  };
});
