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

      $innerEl.appendTo($container);
    },
    controller: function ($scope, $rootScope, ingest) {
      const processor = $scope.processor;
      const Logger = require('../lib/logger');
      const logger = new Logger(processor, 'processContainer', false);

      function updateInputObject() {
        //checks to see if the parent is a basic object or a processor
        if (processor.parent.processorId) {
          processor.inputObject = _.cloneDeep(processor.parent.outputObject);
        } else {
          processor.inputObject = _.cloneDeep(processor.parent);
        }

        $rootScope.$broadcast('processor_input_object_changing', { processor: processor });
      }

      function applyProcessor(event, message) {
        if (message.processor !== processor) return;

        logger.log('I am processing!');
        setDirty();

        ingest.simulate(processor)
        .then(function (result) {
          if (!result) {
            processor.outputObject = _.cloneDeep(processor.inputObject);
          } else {
            processor.outputObject = result;
          }

          logger.log('I am DONE processing!');
          $scope.processorDescription = processor.getDescription();
          $scope.isDirty = false;

          $rootScope.$broadcast('processor_update', { processor: processor });
        });
      }
      applyProcessor = debounce(applyProcessor, 200);

      function parentUpdated(event, message) {
        if (message.processor !== processor.parent) return;

        logger.log('my parent updated');
        updateInputObject();
      }

      function forceUpdate(event, message) {
        if (processor !== message.processor) return;

        logger.log(`I'm being forced to update`);
        updateInputObject();
      }

      function parentDirty(event, message) {
        if (message.processor !== processor.parent) return;

        setDirty();
      }

      function setDirty() {
        $scope.isDirty = true;

        //alert my child if one exists.
        $rootScope.$broadcast('processor_dirty', { processor: processor });
      }

      const forceUpdateListener = $scope.$on('processor_force_update', forceUpdate);
      const updateListener = $scope.$on('processor_update', parentUpdated);
      const dirtyListener = $scope.$on('processor_dirty', parentDirty);
      const inputObjectChangedListener = $scope.$on('processor_input_object_changed', applyProcessor);

      $scope.$on('$destroy', () => {
        forceUpdateListener();
        updateListener();
        dirtyListener();
        inputObjectChangedListener();
      });
    }
  };
});
