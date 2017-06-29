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
    scope: {
      indexPatternName: '=',
      allIndices: '=',
      allTemplateIndexPatterns: '=',
      partialMatchingIndices: '=',
      partialMatchingTemplateIndexPatterns: '=',
      matchingIndices: '=',
      matchingTemplateIndexPatterns: '=',
      goToNextStep: '&',
    },
    link: function (scope) {
      scope.matchingIndicesListType = 'noMatches';
      scope.documentationLinks = documentationLinks;
    },
  };
});
