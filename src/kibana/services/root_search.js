define(function (require) {
  var module = require('modules').get('kibana/services');

  module.service('rootSearch', function (courier, config, $rootScope) {
    return courier.createSource('search')
      .index(config.get('defaultIndex'));
  });
});