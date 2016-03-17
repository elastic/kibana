import UiModules from 'ui/modules';

const spinnerTemplate = '<div class="spinner" ng-show="chrome.httpActive.length"></div>';

UiModules
.get('ui/kibana')
.directive('kbnLoadingIndicator', function($compile) {
  return {
    restrict: 'AC',
    link: function(scope, $el) {
      const $loadingEl = angular.element(spinnerTemplate);
      $el.append($loadingEl);
      $compile($loadingEl)(scope);
    }
  }
});
