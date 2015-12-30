const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
require('./processor_header');

//THIS IS THE SCOPE OF THE INDIVIDUAL PROCESSORS.
app.directive('innerProcessor', function () {
  return {
    restrict: 'E',
    scope: {
      processor: '='
    },
    template: require('../views/inner_processor.html'),
    controller : function ($scope, $rootScope, $timeout) {
      const processor = $scope.processor;

      function applyProcessor() {
        $rootScope.$broadcast('processor_started', { processor: processor });

        //this is just here to simulate an async process.
        $timeout(function() {
          //each processor will generate it's own output object
          let output = _.cloneDeep(processor.inputObject);
          let key = `processor_${processor.processorId}_field`;
          let value = new Date().toString();
          _.set(output, key, value);

          //each processor will generate it's own description
          let description = `Added ${key}`;

          const message = {
            processor: processor,
            output: output,
            description: description
          };

          $rootScope.$broadcast('processor_finished', message);
        }, 300);
      }

      function processorStart(event, message) {
        if (message.processor !== processor) return;

        applyProcessor();
      }

      const startListener = $scope.$on('processor_start', processorStart);

      //internal only (linked to the button, no other use, for debug only)
      //this would be logic that would be triggered from any processor
      //specific state changes like selectedfield or expression, etc
      $scope.update = function() {
        applyProcessor();
      }

      $scope.$on('$destroy', () => {
        startListener();
      });
    }
  }
});

app.directive('processorSimple1', function ($compile) {
  return {
    restrict: 'E',
    template: require('../views/processor_simple1.html'),
    link: function ($scope, $el) {
      const processor = $scope.processor;
      const $container = $el.find('.inner_processor_container');

      const scope = $scope.$new();
      const $innerEl = $compile(processor.innerTemplate)(scope);

      $innerEl.appendTo($container);
    },
    controller: function ($scope, $rootScope) {
      const processor = $scope.processor;

      function parentUpdated(event, message) {
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
          processor.inputObject = _.cloneDeep($scope.parent.outputObject);
        } else {
          processor.inputObject = _.cloneDeep($scope.parent);
        }
      }

      function applyProcessor() {
        //tell the inner processor to start work.
        $rootScope.$broadcast('processor_start', { processor: processor });
      }

      function processorStarted(event, message) {
        if (processor !== message.processor) return;

        //the inner processor has started to work (either on it's own or from us telling it to)
        setDirty();
      }

      //the inner processor has told us it's done.
      function processorFinished(event, message) {
        if (processor !== message.processor) return;

        processor.outputObject = message.output;
        $scope.processorDescription = message.description;
        $scope.isDirty = false;

        $rootScope.$broadcast('processor_update', { processor: processor });
      }

      function setDirty() {
        $scope.isDirty = true;

        //alert my child if one exists.
        $rootScope.$broadcast('processor_dirty', { processor: processor });
      }

      const updateListener = $scope.$on('processor_update', parentUpdated);
      const dirtyListener = $scope.$on('processor_dirty', parentDirty);
      const startedListener = $scope.$on('processor_started', processorStarted);
      const finishedListener = $scope.$on('processor_finished', processorFinished);

      $scope.$on('$destroy', () => {
        updateListener();
        dirtyListener();
        startedListener();
        finishedListener();
      });

      //external hooks
      $scope.forceUpdate = function() {
        applyProcessor();
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
