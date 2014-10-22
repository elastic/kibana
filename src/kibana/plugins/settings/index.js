define(function (require, module, exports) {
  var _ = require('lodash');

  require('css!plugins/settings/styles/main.css');
  require('filters/start_from');

  require('routes')
  .when('/settings', {
    redirectTo: '/settings/indices'
  });

  require('modules').get('apps/settings')
  .directive('kbnSettingsApp', function (Private, $route, timefilter) {
    return {
      restrict: 'E',
      template: require('text!plugins/settings/app.html'),
      transclude: true,
      scope: {
        sectionName: '@section'
      },
      link: function ($scope, $el) {
        timefilter.enabled = false;
        $scope.sections = require('plugins/settings/sections/index');
        $scope.section = _.find($scope.sections, { name: $scope.sectionName });

        $scope.sections.forEach(function (section) {
          section.class = (section === $scope.section) ? 'active' : void 0;
        });
      }
    };
  });

  var apps = require('registry/apps');
  apps.register(function SettingsAppModule() {
    return {
      id: 'settings',
      name: 'Settings',
      order: 3
    };
  });
});
