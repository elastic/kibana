import modules from 'ui/modules';
import template from 'plugins/kibana/settings/sections/indices/upload/directives/upload_wizard.html';
import IngestProvider from 'ui/ingest';
import 'plugins/kibana/settings/sections/indices/add_data_steps/pattern_review_step';
import 'plugins/kibana/settings/sections/indices/add_data_steps/parse_csv_step';
import 'plugins/kibana/settings/sections/indices/add_data_steps/pipeline_setup';
import 'plugins/kibana/settings/sections/indices/add_data_steps/upload_data_step';

modules.get('apps/settings')
  .directive('uploadWizard', function () {
    return {
      restrict: 'E',
      template: template,
      scope: {},
      bindToController: true,
      controllerAs: 'wizard',
      controller: function ($scope, AppState, safeConfirm, kbnUrl, $http, Notifier, $window, config, Private) {
        const ingest = Private(IngestProvider);
        const $state = this.state = new AppState();

        var notify = new Notifier({
          location: 'Add Data'
        });

        var totalSteps = 3;
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
          else if ($state.currentStep + 1 === totalSteps) {
            kbnUrl.change('/discover', null, {index: this.stepResults.indexPattern.id});
          }
        };

        this.prevStep = () => {
          if ($state.currentStep > 0) {
            this.setCurrentStep($state.currentStep - 1);
          }
        };

        this.save = () => {
          return ingest.save(this.stepResults.indexPattern)
            .then(
              () => {
                this.nextStep();
              },
              (err) => {
                notify.error(err);
                $window.scrollTo(0,0);
              }
            );
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

