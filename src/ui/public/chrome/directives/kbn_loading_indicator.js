import UiModules from 'ui/modules';

const spinnerTemplate = '<div class="spinner" ng-show="chrome.httpActive.length"></div>';

UiModules
.get('ui/kibana')
.directive('kbnLoadingIndicator', function () {
  return {
    restrict: 'E',
    template: spinnerTemplate,
  };
});
