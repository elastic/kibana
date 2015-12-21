const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');

require('./processor_grok');
require('./processor_regex');

app.directive('pipelineSetup', function ($compile) {
  return {
    restrict: 'E',
    template: require('../views/pipeline_setup.html'),
    link: function ($scope, $el) {
      let counter = 0;

      const $container = $el;
      $el = $container.find('.pipeline-wrapper');

      let lastProcessor = undefined;

      $scope.$watchCollection('processors', function (processors) {
        const currentProcessors = getCurrentProcessors();

        var removed = _.difference(currentProcessors, processors);
        var added = _.difference(processors, currentProcessors);

        if (removed.length) removed.forEach(removeProcessor);
        if (added.length) added.forEach(addProcessor);
      });

      function getCurrentProcessors() {
        let currentProcessors = [];
        $el.find('li').each((index, li) => {
          const processor = $(li).data('processor');
          currentProcessors.push(processor)
        });

        return currentProcessors;
      }

      function addProcessor(processor) {
        counter += 1;

        processor.$scope = $scope.$new();
        processor.$scope.processor = processor;
        processor.$scope.counter = counter;
        if (lastProcessor) {
          processor.$scope.inputObject = lastProcessor.$scope.outputObject;
        } else {
          processor.$scope.inputObject = $scope.inputObject;
        }

        processor.$el = $compile(`<li>${processor.template}</li>`)(processor.$scope);
        processor.$el.appendTo($el);

        processor.$el.data('processor', processor);
        processor.$el.data('$scope', processor.$scope);

        lastProcessor = processor;
      }

      //TODO: This functionality is completely untested.
      function removeProcessor(processor) {
        // destroy the scope
        processor.$scope.$destroy();

        processor.$el.removeData('processor');
        processor.$el.removeData('$scope');
      }
    },
    controller: function ($scope, AppState) {
      $scope.processorTypes = require('../lib/processor_registry.js');
      $scope.defaultProcessorType = getDefaultProcessorType();
      $scope.processorType = $scope.defaultProcessorType;
      $scope.processors = [ $scope.defaultProcessorType ];
      $scope.inputObject = {};

      $scope.addProcessor = function() {
        var newProcessor = _.cloneDeep($scope.processorType);
        $scope.processors.push(newProcessor);
      }

      function getDefaultProcessorType() {
        return _.first(_.filter($scope.processorTypes, processor => { return processor.default }));
      }
    }
  };
});
