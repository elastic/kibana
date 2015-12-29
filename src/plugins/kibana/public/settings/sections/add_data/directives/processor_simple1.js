const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');
const objectManager = require('../lib/object_manager');
require('./processor_header');

app.directive('processorSimple1', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_simple1.html'),
    controller: function ($scope, $rootScope, $timeout) {

      function parentUpdated(event, message) {
        const processor = $scope.processor;

        if (message.processor === $scope.parent) {
          updateInputObject();
          applyProcessor();
        }
      }

      function parentDirty(event, message) {
        if (message.processor === $scope.parent) {
          setDirty();
        }
      }

      function updateInputObject() {
        //checks to see if the parent is a basic object or a processor
        if ($scope.parent.processorId) {
          $scope.inputObject = _.cloneDeep($scope.parent.outputObject);
        } else {
          $scope.inputObject = _.cloneDeep($scope.parent);
        }
      }

      function applyProcessor() {
        const processor = $scope.processor;
        setDirty();

        //this is just here to simulate an async process.
        $timeout(function() {
          let output = _.cloneDeep($scope.inputObject);
          let key = `processor_${processor.processorId}_field`;
          let value = new Date().toString();
          _.set(output, key, value);

          processor.outputObject = output;
          $scope.isDirty = false;

          $rootScope.$broadcast('processor_update', { processor: processor });
        }, 1000);
      }

      function setDirty() {
        const processor = $scope.processor;
        $scope.isDirty = true;

        //alert my child if one exists.
        $rootScope.$broadcast('processor_dirty', { processor: processor });
      }

      $scope.$on('processor_update', parentUpdated);
      $scope.$on('processor_dirty', parentDirty);

      //internal only (linked to the button, no other use, for debug only)
      $scope.update = function() {

        applyProcessor();
      }

      //external hooks
      $scope.forceUpdate = function() {
        $scope.update();
      }

      //returns whether the parent actually changed
      $scope.setParent = function(parent) {
        const oldParent = $scope.parent;
        $scope.parent = parent;

        updateInputObject();

        //When the processor is assigned a parent for the first time, process.
        if (!oldParent) applyProcessor();

        return (oldParent !== parent);
      }
    }
  };
});
