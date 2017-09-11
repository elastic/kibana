import 'plugins/kibana/management/sections';
import 'plugins/kibana/management/styles/main.less';
import 'ui/filters/start_from';
import 'ui/field_editor';
import uiRoutes from 'ui/routes';
// import { uiModules } from 'ui/modules';
// import appTemplate from 'plugins/kibana/management/app.html';
// import reactAppTemplate from 'plugins/kibana/management/react/app.html';
// import landingTemplate from 'plugins/kibana/management/landing.html';
import { management } from 'ui/management';
import 'ui/kbn_top_nav';

import ReactApp from './react';
import {
  fetchIndexPatterns,
} from './react/store/actions/index-pattern-list';
import {
  getIndexPatterns,
} from './react/store/reducers/index-pattern-list';

const managementAppId = 'managementRoot';

uiRoutes
.when('/management', {
  template: '',
  controller: ($scope, $injector) => {
    ReactApp.setGlobals($injector);
    // const config = $injector.get('config');
    const kbnUrl = $injector.get('kbnUrl');

    const { getState, dispatch } = ReactApp.getStore();
    fetchIndexPatterns()(dispatch, getState)
    .then(() => {
      const indexPatterns = getIndexPatterns(getState());
      if (indexPatterns.length > 0) {
        kbnUrl.change(`/management/kibana/indices`);
      } else {
        kbnUrl.change(`/management/kibana/index`);
      }
      $scope.$apply();
    });
  }
});

uiRoutes
.when('/management/:section', {
  redirectTo: '/management'
});

uiRoutes
.when('/management/kibana/index', {
  template: `<div id="${managementAppId}"></div>`,
  controller: ($injector) => {
    ReactApp.init($injector, management);
    ReactApp.renderIndexPatternCreate(managementAppId);
  }
});

uiRoutes
.when('/management/kibana/indices', {
  template: `<div id="${managementAppId}"></div>`,
  controller: ($injector) => {
    ReactApp.init($injector, management);
    ReactApp.renderIndexPatternList(managementAppId);
  }
});

uiRoutes
.when('/management/kibana/indices/:id', {
  template: `<div id="${managementAppId}"></div>`,
  controller: ($injector) => {
    const route = $injector.get('$route');
    const indexPatternId = route.current.params.id;
    ReactApp.init($injector, management);
    ReactApp.renderIndexPatternView(managementAppId, indexPatternId);
  }
});

// require('ui/index_patterns/route_setup/load_default')({
//   whenMissingRedirectTo: '/management/kibana/index'
// });

// uiModules
// .get('apps/management')
// .directive('kbnManagementApp', function (Private, $location, timefilter, kbnVersion, $injector) {
//   return {
//     restrict: 'E',
//     template: reactAppTemplate,
//     transclude: true,
//     scope: {
//       sectionName: '@section',
//       omitPages: '@omitBreadcrumbPages',
//       pageTitle: '='
//     },

//     link: function ($scope) {
//       timefilter.enabled = false;
//       $scope.sections = management.items.inOrder;
//       $scope.section = management.getSection($scope.sectionName) || management;

//       if ($scope.section) {
//         $scope.section.items.forEach(item => {
//           item.active = `#${$location.path()}`.indexOf(item.url) > -1;
//         });
//       }
//     }
//   };
// });

// uiModules
// .get('apps/management')
// .directive('kbnManagementLanding', function (kbnVersion) {
//   return {
//     restrict: 'E',
//     link: function ($scope) {
//       $scope.sections = management.items.inOrder;
//       $scope.kbnVersion = kbnVersion;
//     }
//   };
// });
