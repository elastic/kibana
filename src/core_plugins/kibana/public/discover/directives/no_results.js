import { uiModules } from 'ui/modules';
import noResultsTemplate from '../partials/no_results.html';
import { documentationLinks } from 'ui/documentation_links/documentation_links';

uiModules
.get('apps/discover')
.directive('discoverNoResults', function () {
  return {
    restrict: 'E',
    template: noResultsTemplate,
    controller: function ($scope) {
      $scope.queryDocLinks = documentationLinks.query;
    }
  };
});
