import _ from 'lodash';
import sections from 'plugins/kibana/settings/sections/index';
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
});
