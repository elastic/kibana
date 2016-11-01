import UiModules from 'ui/modules';
import angular from 'angular';
import template from './loading_indicator.html';
import './loading_indicator.less';

UiModules
.get('ui/kibana')
.directive('kbnLoadingIndicator', function ($compile) {
  return {
    restrict: 'E',
    replace: true,
    template,
  };
});
