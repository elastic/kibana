define(function (require) {
  const _ = require('lodash');
  const registry = require('ui/registry/settings_sections');

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
    order: 1001,
    name: 'about',
    display: 'About',
    url: '#/settings/about'
  }));
});
