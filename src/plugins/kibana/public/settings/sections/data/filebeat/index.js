var routes = require('ui/routes');
var modules = require('ui/modules');
var template = require('plugins/kibana/settings/sections/data/filebeat/index.html');

require('plugins/kibana/settings/sections/data/directives/pattern_review_step');
require('plugins/kibana/settings/sections/data/directives/paste_samples_step');
require('plugins/kibana/settings/sections/data/directives/pipeline_step');
require('plugins/kibana/settings/sections/data/directives/install_filebeat_step');

routes.when('/settings/data/filebeat', {
  template: template
});

// wrapper directive, which sets up the breadcrumb for all filebeat steps
modules.get('apps/settings')
  .controller('kbnSettingsDataFilebeat', function ($scope) {
    var totalSteps = 4;
    $scope.currentStep = 0;
    $scope.stepResults = {};

    $scope.nextStep = function () {
      if ($scope.currentStep + 1 < totalSteps) {
        ++$scope.currentStep;
      }
    };
    $scope.prevStep = function () {
      if ($scope.currentStep > 0) {
        --$scope.currentStep;
      }
    };
    $scope.setCurrentStep = function (step) {
      $scope.currentStep = step;
    };
  });
