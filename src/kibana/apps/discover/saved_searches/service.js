define(function (require) {

  var module = require('modules').get('discover/saved_searches');
  var _ = require('lodash');

  require('./saved_search');

  module.service('savedSearches', function (courier, configFile, createNotifier, SavedSearch) {
    var notify = createNotifier({
      location: 'Saved Searches'
    });

    this.get = function (id) {
      return (new SavedSearch(id)).init();
    };
  });
});