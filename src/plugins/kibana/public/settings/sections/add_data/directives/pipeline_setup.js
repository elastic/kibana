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
        const scope = $scope.$new();
        scope.processor = processor;
        scope.manager = $scope.manager;

        const template = `<li><process-container></process-container></li>`;

        processor.$el = $compile(template)(scope);
        processor.$el.appendTo($el);
      }

      function removeProcessor(processor) {
        processor.$el.slideUp(200, () => {
          processor.$el.remove();
        });

        // destroy the scope
        processor.$scope.$destroy();
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

          let changed = processor.setParent(newParent);
          if (changed) {
            topIndexChanged = Math.min(index, topIndexChanged);
          }
        });

        if (topIndexChanged < Infinity) {
          $scope.forceUpdate(processors[topIndexChanged]);
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
    controller: function ($scope, $rootScope, AppState) {
      $scope.processorTypes = require('../lib/processor_registry.js');
      $scope.defaultProcessorType = getDefaultProcessorType();
      $scope.processorType = $scope.defaultProcessorType;
      $scope.manager = new ProcessorManager();
      window.manager = $scope.manager; //TODO: Remove This!
      $scope.sampleData = {};

      function getDefaultProcessorType() {
        return _.first(_.filter($scope.processorTypes, processor => { return processor.default }));
      }

      $scope.forceUpdate = function(processor) {
        $rootScope.$broadcast('processor_force_update', { processor: processor });
      }
    }
  };
});
