import 'ui/pager_control';
import 'ui/pager';
import { uiModules } from 'ui/modules';
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
      isLoading: '=',
    },
    link: function (scope) {
      scope.$watch('matchingIndicesList.indices', () => {
        scope.matchingIndicesList.calculateItemsOnPage();
      });
    },
    controller: function () {
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
    },
  };
});
