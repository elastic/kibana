import UiModules from 'ui/modules';
import angular from 'angular';

const spinnerTemplate = '<div class="spinner" ng-show="chrome.httpActive.length"></div>';

UiModules
.get('ui/kibana')
.directive('kbnLoadingIndicator', function ($compile) {
  return {
    restrict: 'E',
    template: spinnerTemplate,
  };
});
