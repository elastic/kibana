import uiModules from 'ui/modules';
import _ from 'lodash';
import '../styles/_processor_ui_container.less';
import './output_preview';
import './processor_ui_container_header';
import template from '../views/processor_ui_container.html';

const app = uiModules.get('kibana');

app.directive('processorUiContainer', function ($compile) {
  return {
    restrict: 'E',
    scope: {
      pipeline: '=',
      processor: '='
    },
    template: template,
    link: function ($scope, $el) {
      const processor = $scope.processor;
      const pipeline = $scope.pipeline;
      const $container = $el.find('.processor-ui-content');
      const typeId = processor.typeId;

      const newScope = $scope.$new();
      newScope.pipeline = pipeline;
      newScope.processor = processor;

      const template = `<processor-ui-${typeId}></processor-ui-${typeId}>`;
      const $innerEl = $compile(template)(newScope);

      $innerEl.appendTo($container);
    }
  };
});
