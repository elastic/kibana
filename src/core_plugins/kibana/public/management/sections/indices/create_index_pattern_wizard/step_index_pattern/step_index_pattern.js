import { uiModules } from 'ui/modules';
import './step_index_pattern.less';
import template from './step_index_pattern.html';
import { documentationLinks } from 'ui/documentation_links/documentation_links';

const module = uiModules.get('apps/management');

module.directive('stepIndexPattern', function () {
  return {
    restrict: 'E',
    template,
    replace: true,
    controllerAs: 'stepIndexPattern',
    bindToController: true,
    scope: {
      fetchExistingIndices: '&',
      isFetchingExistingIndices: '=',
      fetchMatchingIndices: '&',
      isFetchingMatchingIndices: '=',
      hasIndices: '&',
      indexPatternName: '=',
      allIndices: '=',
      allTemplateIndexPatterns: '=',
      partialMatchingIndices: '=',
      matchingIndices: '=',
      goToNextStep: '&',
    },
    link: function (scope) {
      scope.$watch('stepIndexPattern.allIndices', scope.stepIndexPattern.updateList);
      scope.$watch('stepIndexPattern.matchingIndices', scope.stepIndexPattern.updateList);
      scope.$watch('stepIndexPattern.indexPatternName', () => {
        // Only send the request if there's valid input.
        if (scope.stepIndexPattern.indexPatternNameForm && scope.stepIndexPattern.indexPatternNameForm.$valid) {
          scope.stepIndexPattern.fetchMatchingIndices();
        }

        // If the index pattern name is invalid, we should reflect that state in the list.
        scope.stepIndexPattern.updateList();
      });
    },
    controller: function () {
      this.matchingIndicesListType = 'noMatches';
      this.documentationLinks = documentationLinks;

      this.hasInvalidInput = () => {
        return this.indexPatternNameForm && this.indexPatternNameForm.$invalid;
      };

      const hasNoInput = () => {
        return !this.indexPatternName || !this.indexPatternName.trim();
      };

      const hasSimilarMatches = () => {
        if (!this.matchingIndices.length) {
          return this.partialMatchingIndices.length;
        }

        return false;
      };

      this.hasExactMatches = () => {
        return this.matchingIndices.length;
      };

      this.updateList = () => {
        if (this.hasInvalidInput()) {
          return this.matchingIndicesListType = 'invalidIndexPattern';
        }

        if (hasNoInput()) {
          return this.matchingIndicesListType = 'noInput';
        }

        if (this.hasExactMatches()) {
          return this.matchingIndicesListType = 'exactMatches';
        }

        if (hasSimilarMatches()) {
          return this.matchingIndicesListType = 'partialMatches';
        }

        this.matchingIndicesListType = 'noMatches';
      };
    },
  };
});
