define(function (require) {
  var _ = require('lodash');

  require('routes')
  .when('/settings/about', {
    template: require('text!plugins/settings/sections/about/index.html')
  });

  require('modules').get('apps/settings')
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