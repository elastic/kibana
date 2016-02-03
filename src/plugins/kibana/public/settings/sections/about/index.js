import _ from 'lodash';
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

  return {
    order: Infinity,
    name: 'about',
    display: 'About',
    url: function () {
      const hash = window.location.hash;
      return hash.indexOf('/about') === -1 ? '#/settings/about?' + hash.split('?')[1] : '#/settings/about';
    }
  };
});
