import _ from 'lodash';
import $ from 'jquery';
import uiModules from 'ui/modules';
import noResultsTemplate from '../partials/no_results.html';

uiModules
.get('apps/discover')
.directive('discoverNoResults', function () {
  return {
    restrict: 'E',
    template: noResultsTemplate
  };
});
