import uiModules from 'ui/modules';
import _ from 'lodash';
import '../styles/_process_container.less';
import './process_container_header';

const app = uiModules.get('kibana');

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
      const typeId = processor.data.typeId;

      const newScope = $scope.$new();
      newScope.pipeline = pipeline;
      newScope.processor = processor;

      const template = `<processor-ui-${typeId}></processor-ui-${typeId}>`;
      const $innerEl = $compile(template)(newScope);

      $innerEl.appendTo($container);
    }
  };
});
