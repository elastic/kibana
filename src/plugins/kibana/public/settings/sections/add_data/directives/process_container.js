const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
require('./process_container_header');

app.directive('processContainer', function ($compile) {
  return {
    restrict: 'E',
    template: require('../views/process_container.html'),
    link: function ($scope, $el) {
      const processor = $scope.processor;
      const $container = $el.find('.process-worker-container');

      const scope = $scope.$new();
      scope.processor = processor;
      const $innerEl = $compile(processor.template)(scope);

      //THIS IS TEMPORARY!!!!
      $scope.$inner_scope = scope;

      $innerEl.appendTo($container);
    },
    controller: function ($scope, $rootScope) {
      const processor = $scope.processor;
      const Logger = require('../lib/logger');
      const logger = new Logger(processor, 'processContainer', true);

      function parentUpdated(event, message) {
        if (message.processor === processor.parent) {
          logger.log('my parent updated');
          updateInputObject();

          $scope.$inner_scope.poop();

          applyProcessor();
        }
      }

      function parentDirty(event, message) {
        if (message.processor === processor.parent) {
          setDirty();
        }
      }

      function updateInputObject() {
        //checks to see if the parent is a basic object or a processor
        if (processor.parent.processorId) {
          processor.inputObject = _.cloneDeep(processor.parent.outputObject);
        } else {
          processor.inputObject = _.cloneDeep(processor.parent);
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

      //Can the parent go into the processor instead of the scope?

      //returns whether the parent actually changed
      //DO NOT DO ANYTHING THAT REQUIRES PROCESSING HERE!!!!
      $scope.setParent = function(parent) {
        const oldParent = processor.parent;
        processor.parent = parent;

        updateInputObject();
        //TODO: Somewhere the new processor needs to be initialized!

        return (oldParent !== parent);
      }
    }
  };
});
