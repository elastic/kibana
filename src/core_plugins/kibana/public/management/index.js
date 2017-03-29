import 'plugins/kibana/management/sections';
import 'plugins/kibana/management/styles/main.less';
import 'ui/filters/start_from';
import 'ui/field_editor';
import 'plugins/kibana/management/sections/indices/_indexed_fields';
import 'plugins/kibana/management/sections/indices/_scripted_fields';
import 'plugins/kibana/management/sections/indices/source_filters/source_filters';
import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';
import appTemplate from 'plugins/kibana/management/app.html';
import landingTemplate from 'plugins/kibana/management/landing.html';
import management from 'ui/management';
import 'ui/kbn_top_nav';

uiRoutes
.when('/management', {
  template: landingTemplate
});

uiRoutes
.when('/management/:section', {
  redirectTo: '/management'
});

require('ui/index_patterns/route_setup/load_default')({
  whenMissingRedirectTo: '/management/kibana/index'
});

uiModules
.get('apps/management')
.directive('kbnManagementApp', function (Private, $location, timefilter, buildNum, buildSha) {
  return {
    restrict: 'E',
    template: appTemplate,
    transclude: true,
    scope: {
      sectionName: '@section',
      omitPages: '@omitBreadcrumbPages'
    },

    link: function ($scope) {
      timefilter.enabled = false;
      $scope.sections = management.items.inOrder;
      $scope.section = management.getSection($scope.sectionName) || management;

      if ($scope.section) {
        $scope.section.items.forEach(item => {
          item.active = `#${$location.path()}`.indexOf(item.url) > -1;
        });
      }

      management.getSection('kibana').info = `Build ${buildNum}, Commit SHA ${buildSha.substr(0, 8)}`;
    }
  };
});

uiModules
.get('apps/management')
.directive('kbnManagementLanding', function (kbnVersion) {
  return {
    restrict: 'E',
    link: function ($scope) {
      $scope.sections = management.items.inOrder;
      $scope.kbnVersion = kbnVersion;
    }
  };
});
