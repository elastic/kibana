import _ from 'lodash';
import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';
import indexTemplate from 'plugins/kibana/settings/sections/about/index.html';

uiRoutes
.when('/settings/about', {
  template: indexTemplate
});

uiModules.get('apps/settings')
.controller('settingsAbout', function ($scope, kbnVersion, buildNum, buildSha) {
  $scope.kbnVersion = kbnVersion;
  $scope.buildNum = buildNum;
  $scope.buildSha = buildSha;
});

export default {
  order: Infinity,
  name: 'about',
  display: 'About',
  url: '#/settings/about'
};
