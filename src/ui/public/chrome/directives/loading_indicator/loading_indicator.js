import { uiModules } from 'ui/modules';
import template from './loading_indicator.html';
import './loading_indicator.less';

uiModules
.get('ui/kibana')
.directive('kbnLoadingIndicator', function () {
  return {
    restrict: 'E',
    replace: true,
    template,
  };
});
