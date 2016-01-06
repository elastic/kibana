const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const ProcessorManager = require('../lib/processor_manager');

require('./processors');
require('./list_of_values');

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
        const $newEl = $compile(template)(scope);
        $scope.$elements[processor.processorId] = $newEl;
        $newEl.appendTo($el);
      }

      function removeProcessor(processor) {
        const $el = $scope.$elements[processor.processorId];
        $el.slideUp(200, () => {
          $el.remove();
        });
      }

      function updateProcessorChain() {
        const topProcessorChanged = manager.updateParents();
        if (topProcessorChanged) {
          console.log('updateProcessorChain, topProcessorChanged: ', topProcessorChanged.processorId);
          $rootScope.$broadcast('processor_force_update', { processor: topProcessorChanged });
        }
      }

      function reorderDom() {
        const processors = $scope.manager.processors;
        const $parent = $scope.$el;

        processors.forEach((processor, index) => {
          const $el = $scope.$elements[processor.processorId];

          if (index === 0) {
            if (!$el.is(':first-child')) {
              $el.detach();
              $parent.prepend($el);
            }
          } else {
            const previousProcessor = processors[index-1];
            const $previousEl = $scope.$elements[previousProcessor.processorId];
            if ($el.prev()[0] !== $previousEl[0]) {
              $el.detach();
              $previousEl.after($el);
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
        console.log('pipeline_setup', 'rootObject changed');
        manager.rootObject = $scope.sampleData;
        updateProcessorChain();
      });
    },
    controller: function ($scope, AppState) {
      $scope.processorTypes = require('../lib/processor_registry.js').all().sort();
      $scope.defaultProcessorType = getDefaultProcessorType();
      $scope.processorType = $scope.defaultProcessorType;
      $scope.manager = new ProcessorManager();
      $scope.$elements = {}; //keeps track of the dom elements associated with processors as jquery objects
      $scope.sampleData = {};

      window.$elements = $scope.$elements; //TODO: Remove This!
      window.manager = $scope.manager; //TODO: Remove This!

      function getDefaultProcessorType() {
        return _.first(_.filter($scope.processorTypes, processor => { return processor.default }));
      }
    }
  };
});
