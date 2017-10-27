import { uiModules } from 'ui/modules';
import noResultsTemplate from '../partials/no_results.html';
import 'ui/directives/documentation_link';

uiModules
.get('apps/discover')
.directive('discoverNoResults', function () {
  return {
    restrict: 'E',
    template: noResultsTemplate
  };
});
