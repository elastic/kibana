const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const Pipeline = require('../lib/pipeline');

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
        scope.pipeline = $scope.pipeline;

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
        const { topProcessorChanged, lastProcessor } = $scope.pipeline.updateParents();
        if (topProcessorChanged) {
          $rootScope.$broadcast('processor_force_update', { processor: topProcessorChanged });
        }
        $scope.lastProcessor = lastProcessor;
      }

      function reorderDom() {
        const processors = $scope.pipeline.processors;
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

      $scope.$watchCollection('pipeline.processors', function (newVal, oldVal) {
        var removed = _.difference(oldVal, newVal);
        var added = _.difference(newVal, oldVal);

        removed.forEach(removeProcessor);
        added.forEach(addProcessor);

        updateProcessorChain();
        reorderDom();
      });

      $scope.$watch('sampleData', function(newVal) {
        $scope.pipeline.rootObject = $scope.sampleData;
        updateProcessorChain();
      });
    },
    controller: function ($scope, AppState) {
      const types = require('../lib/processor_registry.js').all();
      $scope.processorTypes = _.sortBy(types, 'title');

      $scope.defaultProcessorType = getDefaultProcessorType();
      $scope.processorType = $scope.defaultProcessorType;
      $scope.pipeline = new Pipeline();
      $scope.$elements = {}; //keeps track of the dom elements associated with processors as jquery objects
      $scope.sampleData = {};

      function getDefaultProcessorType() {
        return _.first(_.filter($scope.processorTypes, processor => { return processor.default }));
      }
    }
  };
});
