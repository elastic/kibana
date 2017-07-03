import { uiModules } from 'ui/modules';
import './step_time_field.less';
import template from './step_time_field.html';
import { documentationLinks } from 'ui/documentation_links/documentation_links';

const module = uiModules.get('apps/management');

module.directive('stepTimeField', function () {
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
    controller: function () {
      this.matchingIndicesListType = 'noMatches';
      this.documentationLinks = documentationLinks;

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
