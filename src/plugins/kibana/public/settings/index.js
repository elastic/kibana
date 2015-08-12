define(function (require, module, exports) {
  var _ = require('lodash');

  var sections = require('plugins/kibana/settings/sections/index');
  require('plugins/kibana/settings/styles/main.less');
  require('ui/filters/start_from');

  require('ui/routes')
  .when('/settings', {
    redirectTo: '/settings/indices'
  });

  require('ui/index_patterns/routeSetup/loadDefault')({
    notRequiredRe: /^\/settings\//,
    whenMissingRedirectTo: '/settings/indices'
  });

  require('ui/modules')
  .get('apps/settings')
  .directive('kbnSettingsApp', function (Private, $route, timefilter) {
    return {
      restrict: 'E',
      template: require('plugins/kibana/settings/app.html'),
      transclude: true,
      scope: {
        sectionName: '@section'
      },
      link: function ($scope, $el) {
        timefilter.enabled = false;
        $scope.sections = sections;
        $scope.section = _.find($scope.sections, { name: $scope.sectionName });

        $scope.sections.forEach(function (section) {
          section.class = (section === $scope.section) ? 'active' : void 0;
        });
      }
    };
  });

  // preload
  require('ui/field_editor');
  require('plugins/kibana/settings/sections/indices/_indexed_fields');
  require('plugins/kibana/settings/sections/indices/_scripted_fields');
});
