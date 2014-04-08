define(function (require) {
  var _ = require('lodash');

  require('./saved_search');
  require('notify/notify');

  var module = require('modules').get('discover/saved_searches', [
    'kibana/notify',
    'kibana/courier'
  ]);

  module.service('savedSearches', function (courier, configFile, createNotifier, SavedSearch) {
    var notify = createNotifier({
      location: 'Saved Searches'
    });

    this.get = function (id) {
      return (new SavedSearch(id)).init();
    };
  });
});