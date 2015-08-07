define(function (require) {
  var _ = require('lodash');

  require('ui/routes')
  .when('/settings/about', {
    template: require('plugins/kibana/settings/sections/about/index.html')
  });

  require('ui/modules').get('apps/settings')
  .controller('settingsAbout', function ($scope, kbnVersion, buildNum, commitSha) {
    $scope.kbnVersion = kbnVersion;
    $scope.buildNum = buildNum;
    $scope.commitSha = commitSha;
  });

  return {
    order: Infinity,
    name: 'about',
    display: 'About',
    url: '#/settings/about'
  };
});
