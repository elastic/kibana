import { uiModules } from 'ui/modules';
import './step_index_pattern.less';
import template from './step_index_pattern.html';
import './append_wildcard';

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
      scope.$watchCollection('stepIndexPattern.indexPatternNameForm.$error', () => {
        // If we immediately replace the input with an invalid string, then only the form state
        // changes, but not the `indexPatternName` value, so we need to watch both.
        scope.stepIndexPattern.updateList();
      });
    },
    controller: function () {
      this.matchingIndicesListType = 'noMatches';
      this.canGoToNextStep = () => (
        !this.isFetchingMatchingIndices
        && !this.indexPatternNameForm.$invalid
        && this.hasExactMatches()
      );

      const hasInvalidIndexPattern = () => (
        this.indexPatternNameForm
        && !this.indexPatternNameForm.$error.required
        && this.indexPatternNameForm.$error.indexPattern
      );

      const hasNoInput = () => (
        !this.indexPatternName
        || !this.indexPatternName.trim()
      );

      this.hasExactMatches = () => (
        this.matchingIndices.length
      );

      const hasPartialMatches = () => (
        !this.matchingIndices.length
        && this.partialMatchingIndices.length
      );

      this.updateList = () => {
        if (hasInvalidIndexPattern()) {
          return this.matchingIndicesListType = 'invalidIndexPattern';
        }

        if (hasNoInput()) {
          return this.matchingIndicesListType = 'noInput';
        }

        if (this.hasExactMatches()) {
          return this.matchingIndicesListType = 'exactMatches';
        }

        if (hasPartialMatches()) {
          return this.matchingIndicesListType = 'partialMatches';
        }

        this.matchingIndicesListType = 'noMatches';
      };
    },
  };
});
