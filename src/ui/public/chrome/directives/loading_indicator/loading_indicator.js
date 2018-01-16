import { uiModules } from 'ui/modules';
import template from './loading_indicator.html';

uiModules
  .get('ui/kibana')
  .directive('kbnLoadingIndicator', function () {
    return {
      restrict: 'E',
      replace: true,
      template,
    };
  });
