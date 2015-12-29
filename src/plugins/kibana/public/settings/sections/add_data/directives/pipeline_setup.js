const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const ProcessorManager = require('../lib/processor_manager');

require('./processors');

app.directive('pipelineSetup', function ($compile) {
  return {
    restrict: 'E',
    template: require('../views/pipeline_setup.html'),
    link: function ($scope, $el) {
      let counter = 0;

      const $container = $el;
      $el = $scope.$el = $container.find('.pipeline-wrapper');

      $scope.$watchCollection('manager.processors', function (processors) {
        const currentProcessors = getCurrentProcessors();

        var removed = _.difference(currentProcessors, processors);
        var added = _.difference(processors, currentProcessors);

        removed.forEach(removeProcessor);
        added.forEach(addProcessor);

        updateProcessorChain();
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
      function updateProcessorChain() {
        const processors = $scope.manager.processors;

        let topIndexChanged = -1;
        processors.forEach((processor, index) => {
          let newParent;
          if (index === 0) {
            newParent = $scope.sampleData;
          } else {
            newParent = processors[index - 1];
          }

          //Do something here to track the top processor in the chain to change (to start the update process);
          let changed = processor.$scope.setParent(newParent);
          if (topIndexChanged === -1 && changed) {
            topIndexChanged = index;
          }
        });
        if (topIndexChanged !== -1) {
          console.log('top index changed', topIndexChanged);
          processors[topIndexChanged].$scope.forceUpdate();
        }
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
      $scope.sampleData = {};

      function getDefaultProcessorType() {
        return _.first(_.filter($scope.processorTypes, processor => { return processor.default }));
      }
    }
  };
});
