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
      const $container = $el;
      $el = $scope.$el = $container.find('.pipeline-container');

      $scope.$watchCollection('manager.processors', function (newVal, oldVal) {
        var removed = _.difference(oldVal, newVal);
        var added = _.difference(newVal, oldVal);

        removed.forEach(removeProcessor);
        added.forEach(addProcessor);

        updateProcessorChain();
        reorderDom();
      });

      function addProcessor(processor) {
        //TODO: This is wrong now... since both the process_container and process_worker share
        //a reference to the same processor object. The processor should not have a reference
        //to the $scope object as is being done here.
        processor.$scope = $scope.$new();
        processor.$scope.processor = processor;
        processor.$scope.manager = $scope.manager;

        const template = `<li><process-container></process-container></li>`;

        processor.$el = $compile(template)(processor.$scope);
        processor.$el.appendTo($el);

        processor.$el.data('processor', processor);
        processor.$el.data('$scope', processor.$scope);
      }

      function removeProcessor(processor) {
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

        let topIndexChanged = Infinity;
        processors.forEach((processor, index) => {
          let newParent;
          if (index === 0) {
            newParent = $scope.sampleData;
          } else {
            newParent = processors[index - 1];
          }

          let changed = processor.$scope.setParent(newParent);
          if (changed) {
            topIndexChanged = Math.min(index, topIndexChanged);
          }
        });

        if (topIndexChanged < Infinity) {
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
              $el.detach();
              $parent.prepend($el);
            }
          } else {
            const previousProcessor = processors[index-1];
            if ($el.prev()[0] !== previousProcessor.$el[0]) {
              $el.detach();
              previousProcessor.$el.after($el);
            }
          }
        });
      }

      $scope.$watch('sampleData', function(newVal) {
        updateProcessorChain();
      });
    },
    controller: function ($scope, AppState) {
      $scope.processorTypes = require('../lib/processor_registry.js');
      $scope.defaultProcessorType = getDefaultProcessorType();
      $scope.processorType = $scope.defaultProcessorType;
      $scope.manager = new ProcessorManager();
      window.manager = $scope.manager; //TODO: Remove This!
      $scope.sampleData = {};

      function getDefaultProcessorType() {
        return _.first(_.filter($scope.processorTypes, processor => { return processor.default }));
      }
    }
  };
});
