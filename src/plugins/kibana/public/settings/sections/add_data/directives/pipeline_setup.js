const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const ProcessorManager = require('../lib/processor_manager');

require('./processor_grok');
require('./processor_regex');
require('./processor_date');
require('./processor_delete_fields');

app.directive('pipelineSetup', function ($compile) {
  return {
    restrict: 'E',
    template: require('../views/pipeline_setup.html'),
    link: function ($scope, $el) {
      let counter = 0;

      const $container = $el;
      $el = $scope.$el = $container.find('.pipeline-wrapper');

      $scope.$watchCollection('manager.processors', function (processors) {
        console.log(0, 'pipelineSetup', 'processor collection watch');
        const currentProcessors = getCurrentProcessors();

        var removed = _.difference(currentProcessors, processors);
        var added = _.difference(processors, currentProcessors);

        removed.forEach(removeProcessor);
        added.forEach(addProcessor);

        rewireScopes();
        reorderDom();
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
        console.log(0, 'pipelineSetup', 'addProcessor');
        counter += 1;

        processor.$scope = $scope.$new();
        processor.$scope.processor = processor;
        processor.$scope.counter = counter;
        processor.$scope.manager = $scope.manager;

        processor.$el = $compile(`<li class="processor">${processor.template}</li>`)(processor.$scope);
        processor.$el.appendTo($el);

        processor.$el.data('processor', processor);
        processor.$el.data('$scope', processor.$scope);
      }

      function removeProcessor(processor) {
        console.log(0, 'pipelineSetup', 'removeProcessor');
        //TODO: look at the destroy logic for the url shortener/clipboard.js stuff

        processor.$el.slideUp(200, () => {
          processor.$el.remove();
        });

        // destroy the scope
        processor.$scope.$destroy();

        processor.$el.removeData('processor');
        processor.$el.removeData('$scope');
      }

      //TODO: Move this into the manager?
      function rewireScopes() {
        console.log(0, 'pipelineSetup', 'rewireScopes');
        const processors = $scope.manager.processors;

        processors.forEach((processor, index) => {
          if (index === 0) {
            processor.$scope.inputObject = $scope.inputObject;
          } else {
            processor.$scope.inputObject = processors[index - 1].$scope.outputObject;
          }
        });
      }

      function reorderDom() {
        const processors = $scope.manager.processors;
        const $parent = $scope.$el;

        processors.forEach((processor, index) => {
          const $el = processor.$el;

          if (index === 0) {
            if (!$el.is(':first-child')) {
              $el.fadeOut(100, () => {
                $el.detach();
                $parent.prepend($el);
                $el.fadeIn(100);
              });
            }
          } else {
            const previousProcessor = processors[index-1];
            if ($el.prev()[0] !== previousProcessor.$el[0]) {
              $el.fadeOut(100, () => {
                $el.detach();
                previousProcessor.$el.after($el);
                $el.fadeIn(100);
              });
            }
          }
        });
      }
    },
    controller: function ($scope, AppState) {
      $scope.processorTypes = require('../lib/processor_registry.js');
      $scope.defaultProcessorType = getDefaultProcessorType();
      $scope.processorType = $scope.defaultProcessorType;
      $scope.manager = new ProcessorManager();
      $scope.inputObject = {};

      function getDefaultProcessorType() {
        return _.first(_.filter($scope.processorTypes, processor => { return processor.default }));
      }
    }
  };
});
