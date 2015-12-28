const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');

require('./processor_grok');
require('./processor_regex');
require('./processor_delete_fields');

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
        console.log('$watchCollection(procesors)', processors);
        const currentProcessors = getCurrentProcessors();

        var removed = _.difference(currentProcessors, processors);
        var added = _.difference(processors, currentProcessors);

        if (removed.length) removed.forEach(removeProcessor);
        if (added.length) added.forEach(addProcessor);
        if (removed.length) rewireScopes(); //TODO: I think this should happen regardless. Remove it from the addProcessor logic.
      });

      function getCurrentProcessors() {
        let currentProcessors = [];
        $el.find('li.processor').each((index, li) => {
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
        processor.$scope.removeProcessor = function() {
          $scope.removeProcessor(processor);
        };
        if (lastProcessor) {
          processor.$scope.inputObject = lastProcessor.$scope.outputObject;
        } else {
          processor.$scope.inputObject = $scope.inputObject;
        }

        processor.$el = $compile(`<li class="processor">${processor.template}</li>`)(processor.$scope);
        processor.$el.appendTo($el);

        processor.$el.data('processor', processor);
        processor.$el.data('$scope', processor.$scope);

        lastProcessor = processor;
      }

      //TODO: This functionality is completely untested.
      function removeProcessor(processor) {
        //TODO: look at the destroy logic for the url shortener/clipboard.js stuff

        processor.$el.remove();

        // destroy the scope
        processor.$scope.$destroy();

        processor.$el.removeData('processor');
        processor.$el.removeData('$scope');
      }

      function rewireScopes() {
        $scope.processors.forEach((processor, index) => {
          if (index === 0) {
            processor.$scope.inputObject = $scope.inputObject;
          } else {
            processor.$scope.inputObject = $scope.processors[index - 1].$scope.outputObject;
          }
        });
      }
    },
    controller: function ($scope, AppState) {
      $scope.processorTypes = require('../lib/processor_registry.js');
      $scope.defaultProcessorType = getDefaultProcessorType();
      $scope.processorType = $scope.defaultProcessorType;
      $scope.processors = [];
      $scope.inputObject = {};

      $scope.removeProcessor = function(processor) {
        const index = $scope.processors.indexOf(processor);
        $scope.processors.splice(index, 1);
      }

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
