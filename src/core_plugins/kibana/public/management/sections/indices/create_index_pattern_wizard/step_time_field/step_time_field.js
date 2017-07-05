import 'ui/toggle_panel';
import { uiModules } from 'ui/modules';
import './step_time_field.less';
import template from './step_time_field.html';
import { documentationLinks } from 'ui/documentation_links/documentation_links';

const module = uiModules.get('apps/management');

module.directive('stepTimeField', function ($translate) {
  return {
    restrict: 'E',
    template,
    replace: true,
    controllerAs: 'stepTimeField',
    bindToController: true,
    scope: {
      indexPatternName: '=',
      expandWildcard: '=',
      canEnableExpandWildcard: '&',
      timeFieldOptions: '=',
      timeFieldOptionsError: '=',
      selectedTimeFieldOption: '=',
      fetchTimeFieldOptions: '&',
      isFetchingTimeFieldOptions: '=',
      goToPreviousStep: '&',
      createIndexPattern: '&',
    },
    link: function (scope) {
      scope.$watch('stepTimeField.canEnableExpandWildcard()', canEnableExpandWildcard => {
        if (!canEnableExpandWildcard) {
          scope.stepTimeField.isAdvancedOptionsVisible = false;
        }
      });
    },
    controller: function () {
      this.isAdvancedOptionsVisible = false;
      this.matchingIndicesListType = 'noMatches';
      this.documentationLinks = documentationLinks;

      this.getAdvancedOptionsButtonLabel = () => {
        return $translate.instant('KIBANA-CREATE_INDEX_PATTERN_STEP_2_ADVANCED_OPTIONS_BUTTON');
      };

      this.onToggleAdvancedOptions = () => {
        this.isAdvancedOptionsVisible = !this.isAdvancedOptionsVisible;
      };

      this.isTimeFieldSelectDisabled = () => (
        this.isFetchingTimeFieldOptions
        || this.timeFieldOptionsError
        || this.timeFieldOptions.length === 1
      );

      this.canCreateIndexPattern = () => (
        !this.timeFieldOptionsError
        && !this.isFetchingTimeFieldOptions
      );
    },
  };
});
