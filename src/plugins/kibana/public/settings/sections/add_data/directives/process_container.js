const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
require('./process_container_header');

app.directive('processContainer', function ($compile) {
  return {
    restrict: 'E',
    scope: {
      pipeline: '=',
      processor: '='
    },
    template: require('../views/process_container.html'),
    link: function ($scope, $el) {
      const processor = $scope.processor;
      const pipeline = $scope.pipeline;
      const $container = $el.find('.process-worker-container');

      const scope = $scope.$new();
      scope.pipeline = pipeline;
      scope.processor = processor;

      const template = `<processor-ui-${processor.typeId}></processor-ui-${processor.typeId}>`;
      const $innerEl = $compile(template)(scope);

      $innerEl.appendTo($container);
    }
  };
});
