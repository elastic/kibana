import 'ui/toggle_panel';
import { uiModules } from 'ui/modules';
import { callAfterBindingsWorkaround } from 'ui/compat';
import './step_time_field.less';
import template from './step_time_field.html';

const module = uiModules.get('apps/management');

module.directive('stepTimeField', function () {
  return {
    restrict: 'E',
    template,
    replace: true,
    controllerAs: 'stepTimeField',
    bindToController: true,
    scope: {
      indexPatternId: '=',
      indexPatternName: '=',
      timeFieldOptions: '=',
      selectedTimeFieldOption: '=',
      fetchTimeFieldOptions: '&',
      isFetchingTimeFieldOptions: '=',
      goToPreviousStep: '&',
      createIndexPattern: '&',
    },
    controller: callAfterBindingsWorkaround(function () {
      this.isTimeFieldSelectDisabled = () => (
        this.isFetchingTimeFieldOptions
        || this.timeFieldOptionsError
      );

      this.isFormValid = () => (
        this.form.$valid
      );

      this.hasTimeFieldOptions = () => (
        this.timeFieldOptions.length > 1
      );

      this.canCreateIndexPattern = () => (
        !this.timeFieldOptionsError
        && !this.isFetchingTimeFieldOptions
        && this.isFormValid()
      );

      this.canShowMainSelect = () => (
        !this.isFetchingTimeFieldOptions && this.hasTimeFieldOptions()
      );

      this.canShowLoadingSelect = () => (
        this.isFetchingTimeFieldOptions
      );

      this.canShowNoTimeBasedFieldsMessage = () => (
        !this.isFetchingTimeFieldOptions && !this.hasTimeFieldOptions()
      );

      this.canShowHelpText = () => (
        this.isFetchingTimeFieldOptions || this.hasTimeFieldOptions()
      );

      this.toggleAdvancedOptions = () => {
        this.showAdvancedOptions = !this.showAdvancedOptions;
      };

      this.showAdvancedOptions = !!this.indexPatternId;
    }),
  };
});
