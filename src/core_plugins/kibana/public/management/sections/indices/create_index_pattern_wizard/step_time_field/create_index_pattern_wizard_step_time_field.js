import { uiModules } from 'ui/modules';
import template from './create_index_pattern_wizard_step_time_field.html';
import { documentationLinks } from 'ui/documentation_links/documentation_links';

const module = uiModules.get('apps/management');

module.directive('createIndexPatternWizardStepTimeField', function () {
  return {
    restrict: 'E',
    template,
    replace: true,
    scope: {
      indexPatternName: '=',
      expandWildcard: '=',
      canEnableExpandWildcard: '&',
      timeFieldOptions: '=',
      timeFieldOptionsError: '=',
      selectedTimeFieldOption: '=',
      refreshTimeFieldOptions: '&',
      isFetchingTimeFieldOptions: '=',
      goToPreviousStep: '&',
      createIndexPattern: '&',
    },
    link: function (scope) {
      scope.matchingIndicesListType = 'noMatches';
      scope.documentationLinks = documentationLinks;

      scope.isTimeFieldSelectDisabled = () => {
        return (
          scope.isFetchingTimeFieldOptions
          || scope.timeFieldOptionsError
          || scope.timeFieldOptions.length === 1
        );
      };

      scope.canCreateIndexPattern = () => {
        return (
          scope.timeFieldOptionsError
          || scope.isFetchingTimeFieldOptions
        );
      };
    },
  };
});
