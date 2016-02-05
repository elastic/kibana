import modules from 'ui/modules';
import template from 'plugins/kibana/settings/sections/indices/add_data_steps/install_filebeat_step.html';

modules.get('apps/settings')
  .directive('installFilebeatStep', function () {
    return {
      template: template,
      scope: {
        results: '='
      },
      controller: function ($scope) {
        var results = $scope.results;
      }
    };
  });

