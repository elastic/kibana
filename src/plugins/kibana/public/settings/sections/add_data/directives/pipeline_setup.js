const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const ProcessorManager = require('../lib/processor_manager');

require('./processors');

app.directive('pipelineSetup', function ($compile, $rootScope) {
  return {
    restrict: 'E',
    template: require('../views/pipeline_setup.html'),
    link: function ($scope, $el) {
      const $container = $el;
      $el = $scope.$el = $container.find('.pipeline-container');

      function addProcessor(processor) {
        const scope = $scope.$new();
        scope.processor = processor;
        scope.manager = $scope.manager;

        const template = `<li><process-container></process-container></li>`;

        //TODO: Attaching the $el to the processor object doesn't feel right. I'd like to
        //fix this at some point.
        processor.$el = $compile(template)(scope);
        processor.$el.appendTo($el);
      }

      function removeProcessor(processor) {
        processor.$el.slideUp(200, () => {
          processor.$el.remove();
        });

        processor.$scope.$destroy();
      }

      function updateProcessorChain() {
        const topProcessorChanged = manager.updateParents();
        if (topProcessorChanged) {
          $rootScope.$broadcast('processor_force_update', { processor: topProcessorChanged });
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

      $scope.$watchCollection('manager.processors', function (newVal, oldVal) {
        var removed = _.difference(oldVal, newVal);
        var added = _.difference(newVal, oldVal);

        removed.forEach(removeProcessor);
        added.forEach(addProcessor);

        updateProcessorChain();
        reorderDom();
      });

      $scope.$watch('sampleData', function(newVal) {
        manager.rootObject = $scope.sampleData;
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
