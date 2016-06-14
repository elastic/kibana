import _ from 'lodash';
import registry from '../../../../../../ui/public/registry/settings_sections';
import uiRoutes from '../../../../../../ui/public/routes';
import uiModules from '../../../../../../ui/public/modules';
import indexTemplate from 'plugins/kibana/settings/sections/about/index.html';

uiRoutes
.when('/settings/about', {
  template: indexTemplate
});

uiModules.get('apps/settings')
.controller('settingsAbout', function ($scope, kbnVersion, buildNum, buildSha, serverName) {
  $scope.kbnVersion = kbnVersion;
  $scope.buildNum = buildNum;
  $scope.buildSha = buildSha;
  $scope.serverName = serverName;
});

registry.register(_.constant({
  order: 1001,
  name: 'about',
  display: 'About',
  url: '#/settings/about'
}));
