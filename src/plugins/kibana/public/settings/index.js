import _ from 'lodash';
import 'plugins/kibana/settings/sections/indices/index';
import 'plugins/kibana/settings/sections/advanced/index';
import 'plugins/kibana/settings/sections/objects/index';
import 'plugins/kibana/settings/sections/status/index';
import 'plugins/kibana/settings/sections/about/index';
import 'plugins/kibana/settings/styles/main.less';
import 'ui/filters/start_from';
import 'ui/field_editor';
import 'plugins/kibana/settings/sections/indices/_indexed_fields';
import 'plugins/kibana/settings/sections/indices/_scripted_fields';

define(function (require) {
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
    const sections = Private(require('ui/registry/settings_sections'));
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
});
