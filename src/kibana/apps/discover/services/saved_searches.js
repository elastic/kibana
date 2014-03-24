define(function (require) {

  var module = require('modules').get('kibana/services');
  var _ = require('lodash');

  require('../factories/saved_search');

  module.service('savedSearches', function (courier, configFile, $q, createNotifier, SavedSearch) {
    var notify = createNotifier({
      location: 'Saved Searches'
    });

    this.get = function (id) {
      var defer = $q.defer();
      var search = new SavedSearch(id);

      search.ready(function (err) {
        if (err) defer.reject(err);
        else defer.resolve(search);
      });

      return defer.promise;
    };
  });
});