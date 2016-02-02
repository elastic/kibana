var modules = require('ui/modules');
var template = require('plugins/kibana/settings/sections/indices/directives/install_filebeat_step.html');

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

