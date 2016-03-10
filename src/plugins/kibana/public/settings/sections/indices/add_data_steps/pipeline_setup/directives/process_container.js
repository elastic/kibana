import uiModules from 'ui/modules';
import _ from 'lodash';

require('../styles/_process_container.less');
require('./process_container_header');

const module = uiModules.get('kibana');

module.directive('processContainer', function ($compile) {
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

      const newScope = $scope.$new();
      newScope.pipeline = pipeline;
      newScope.processor = processor;

      const template = `<processor-ui-${processor.typeId}></processor-ui-${processor.typeId}>`;
      const $innerEl = $compile(template)(newScope);

      $innerEl.appendTo($container);
    }
  };
});
