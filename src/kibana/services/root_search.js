define(function (require) {
  var module = require('modules').get('kibana/services');

  module.service('rootSearch', function (courier, config, $rootScope) {
    var rootSearch = courier.createSource('search');

    config.$watch('defaultIndex', function (defaultIndex) {
      rootSearch.index(defaultIndex);
    });

    return rootSearch;
  });
});