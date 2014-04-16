define(function (require) {
  var _ = require('lodash');
  var inherits = require('utils/inherits');

  require('notify/notify');

  var module = require('modules').get('discover/saved_searches', [
    'kibana/notify',
    'kibana/courier'
  ]);

  module.factory('SavedSearch', function (configFile, courier, Promise, SavedObject) {
    function SavedSearch(id) {
      SavedObject.call(this, {
        type: 'search',

        id: id,

        mapping: {
          title: 'string',
          description: 'string',
          hits: 'number'
        },

        defaults: {
          title: 'New Saved Search',
          description: '',
          hits: 0
        },

        searchSource: true
      });
    }
    inherits(SavedSearch, SavedObject);
    return SavedSearch;
  });
});