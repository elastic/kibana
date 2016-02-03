import _ from 'lodash';
import registry from 'ui/registry/settings_sections';

define(function (require) {
  require('ui/routes')
  .when('/settings/about', {
    template: require('plugins/kibana/settings/sections/about/index.html')
  });

  require('ui/modules').get('apps/settings')
  .controller('settingsAbout', function ($scope, kbnVersion, buildNum, buildSha) {
    $scope.kbnVersion = kbnVersion;
    $scope.buildNum = buildNum;
    $scope.buildSha = buildSha;
  });

  registry.register(_.constant({
    order: Infinity,
    name: 'about',
    display: 'About',
    url: '#/settings/about'
  }));
});
