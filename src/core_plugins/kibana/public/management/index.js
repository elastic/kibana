import 'plugins/kibana/management/sections';
import 'plugins/kibana/management/styles/main.less';
import 'ui/filters/start_from';
import 'ui/field_editor';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import appTemplate from 'plugins/kibana/management/app.html';
import landingTemplate from 'plugins/kibana/management/landing.html';
import { management } from 'ui/management';
import 'ui/kbn_top_nav';

import { ManagementLandingPage } from './management_landing_page';

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

const app = uiModules.get('apps/management', ['react']);

app.directive('managementLandingPage', function (reactDirective) {
  return reactDirective(ManagementLandingPage, [
    'version',
    'addBasePath',
    // Prevent the 'Maximum call stack exceeded' error.
    ['sections', {  watchDepth: 'collection' }],
  ]);
});

app.directive('kbnManagementApp', function (Private, $location, timefilter) {
  return {
    restrict: 'E',
    template: appTemplate,
    transclude: true,
    scope: {
      sectionName: '@section',
      omitPages: '@omitBreadcrumbPages',
      pageTitle: '='
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
    }
  };
});

app.directive('kbnManagementLanding', function (kbnVersion, chrome) {
  return {
    restrict: 'E',
    link: function ($scope) {
      $scope.addBasePath = chrome.addBasePath;
      $scope.sections = management.items.inOrder;
      $scope.kbnVersion = kbnVersion;
    }
  };
});
