var modules = require('ui/modules');
var template = require('plugins/kibana/settings/sections/indices/filebeat/directives/filebeat_wizard.html');

require('plugins/kibana/settings/sections/indices/directives/pattern_review_step');
require('plugins/kibana/settings/sections/indices/directives/paste_samples_step');
require('plugins/kibana/settings/sections/indices/directives/pipeline_step');
require('plugins/kibana/settings/sections/indices/directives/install_filebeat_step');

// wrapper directive, which sets up the breadcrumb for all filebeat steps
modules.get('apps/settings')
.directive('filebeatWizard', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {},
    bindToController: true,
    controllerAs: 'wizard',
    controller: function ($scope, AppState, safeConfirm) {
      var $state = this.state = new AppState();
      var totalSteps = 4;
      this.stepResults = {};

      this.setCurrentStep = (step) => {
        if (!this.complete) {
          $state.currentStep = step;
          $state.save();
        }
      };
      this.setCurrentStep(0);

      this.nextStep = () => {
        if ($state.currentStep + 1 < totalSteps) {
          this.setCurrentStep($state.currentStep + 1);
        }
      };
      this.prevStep = () => {
        if ($state.currentStep > 0) {
          this.setCurrentStep($state.currentStep - 1);
        }
      };

      $scope.$watch('wizard.state.currentStep', (newValue, oldValue) => {
        if (this.complete) {
          $state.currentStep = totalSteps - 1;
          $state.save();
          return;
        }
        if (newValue + 1 === totalSteps) {
          this.complete = true;
        }
        if (newValue < oldValue) {
          return safeConfirm('Going back will reset any changes you\'ve made to this step, do you want to continue?')
            .then(
              () => {
                if ($state.currentStep < 1) {
                  delete this.stepResults.pipeline;
                }
                if ($state.currentStep < 2) {
                  delete this.stepResults.indexPattern;
                }
                this.currentStep = newValue;
              },
              () => {
                $state.currentStep = oldValue;
                $state.save();
              }
            );
        }
        else {
          this.currentStep = newValue;
        }
      });
    }
  };
});
