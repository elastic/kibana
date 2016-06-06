define(function (require, module, exports) {
  const _ = require('lodash');
  var registry = require('ui/registry/settings_sections');

  require('plugins/kibana/settings/sections/indices/index');
  require('plugins/kibana/settings/sections/advanced/index');
  require('plugins/kibana/settings/sections/objects/index');
  require('plugins/kibana/settings/sections/status/index');
  require('plugins/kibana/settings/sections/about/index');
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
    const sections = Private(registry);
    return {
      restrict: 'E',
      template: require('plugins/kibana/settings/app.html'),
      transclude: true,
      scope: {
        sectionName: '@section'
      },
      link: function ($scope, $el) {
        timefilter.enabled = false;
        $scope.sections = sections.inOrder;
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
