import _ from 'lodash';
import chrome from 'ui/chrome/chrome';
import breadCrumbsTemplate from 'ui/partials/bread_crumbs.html';
import uiModules from 'ui/modules';
let module = uiModules.get('kibana');

module.directive('breadCrumbs', function () {
  return {
    restrict: 'E',
    scope: {
      omitCurrentPage: '='
    },
    template: breadCrumbsTemplate,
    controller: function ($scope) {
      $scope.crumbs = chrome.getBreadcrumbs();

      if ($scope.omitCurrentPage === true) {
        $scope.crumbs.pop();
      }
    }
  };
});
