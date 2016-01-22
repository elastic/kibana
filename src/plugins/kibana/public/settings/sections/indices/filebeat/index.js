var routes = require('ui/routes');
var modules = require('ui/modules');
var template = require('plugins/kibana/settings/sections/indices/filebeat/index.html');

require('plugins/kibana/settings/sections/indices/directives/pattern_review_step');
require('plugins/kibana/settings/sections/indices/directives/paste_samples_step');
require('plugins/kibana/settings/sections/indices/directives/pipeline_step');
require('plugins/kibana/settings/sections/indices/directives/install_filebeat_step');

routes.when('/settings/indices/filebeat', {
  template: template
});

// wrapper directive, which sets up the breadcrumb for all filebeat steps
modules.get('apps/settings')
  .controller('kbnSettingsIndicesFilebeat', function ($scope, AppState) {
    var $state = $scope.state = new AppState();
    var totalSteps = 4;
    $scope.stepResults = {};

    $scope.setCurrentStep = function (step) {
      $state.currentStep = step;
      $state.save();
    };
    $scope.setCurrentStep(0);

    $scope.nextStep = function () {
      if ($state.currentStep + 1 < totalSteps) {
        $scope.setCurrentStep($state.currentStep + 1);
      }
    };
    $scope.prevStep = function () {
      if ($state.currentStep > 0) {
        $scope.setCurrentStep($state.currentStep - 1);
      }
    };
  });
