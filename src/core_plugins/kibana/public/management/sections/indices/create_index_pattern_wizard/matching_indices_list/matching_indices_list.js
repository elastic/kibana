import 'ui/pager_control';
import 'ui/pager';
import { last } from 'lodash';
import { uiModules } from 'ui/modules';
import { callAfterBindingsWorkaround } from 'ui/compat';
import './matching_indices_list.less';
import template from './matching_indices_list.html';

const module = uiModules.get('apps/management');

module.directive('matchingIndicesList', function ($filter, pagerFactory) {
  return {
    restrict: 'E',
    replace: true,
    template,
    transclude: true,
    controllerAs: 'matchingIndicesList',
    bindToController: true,
    scope: {
      indices: '=',
      pattern: '=',
      isLoading: '=',
    },
    link: function (scope) {
      scope.$watch('matchingIndicesList.indices', () => {
        scope.matchingIndicesList.calculateItemsOnPage();
      });
      scope.$watch('matchingIndicesList.pattern', () => {
        if (last(scope.matchingIndicesList.pattern) === '*') {
          const end = scope.matchingIndicesList.pattern.length - 1;
          scope.matchingIndicesList.formattedPattern = scope.matchingIndicesList.pattern.substring(0, end);
        } else {
          scope.matchingIndicesList.formattedPattern = scope.matchingIndicesList.pattern;
        }
      });
    },
    controller: callAfterBindingsWorkaround(function () {
      this.pageOfIndices = [];

      this.calculateItemsOnPage = () => {
        const limitTo = $filter('limitTo');
        this.pager.setTotalItems(this.indices.length);
        this.pageOfIndices = limitTo(this.indices, this.pager.pageSize, this.pager.startIndex);
      };

      this.pager = pagerFactory.create(this.indices.length, 10, 1);

      this.hasMultiplePages = () => {
        return this.indices.length > this.pager.pageSize;
      };

      this.onPageNext = () => {
        this.pager.nextPage();
        this.calculateItemsOnPage();
      };

      this.onPagePrevious = () => {
        this.pager.previousPage();
        this.calculateItemsOnPage();
      };
    }),
  };
});
