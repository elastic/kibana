import _ from 'lodash';
import chrome from 'ui/chrome/chrome';
import breadCrumbsTemplate from 'ui/partials/bread_crumbs.html';
import uiModules from 'ui/modules';
var module = uiModules.get('kibana');

module.directive('breadCrumbs', function () {
  return {
    restrict: 'E',
    scope: true,
    template: breadCrumbsTemplate,
    controller: function ($scope) {
      $scope.crumbs = chrome.getBreadcrumbs();

      if (_.last($scope.crumbs) === '') {
        // Remove the empty string from the end of the array
        $scope.crumbs.pop();
      }
    }
  };
});
