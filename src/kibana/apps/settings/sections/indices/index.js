define(function (require) {
  var _ = require('utils/mixins');

  var app = require('modules').get('app/settings');

  require('services/state');
  require('./service_pattern.js');



  app.controller('indices', function ($scope, config, courier, createNotifier, state) {
    console.log('lol');
    $scope.lol = 'lol';
  });
});