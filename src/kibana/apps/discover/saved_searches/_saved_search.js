define(function (require) {
  var _ = require('lodash');
  var inherits = require('lodash').inherits;

  require('components/notify/notify');

  var module = require('modules').get('discover/saved_searches', [
    'kibana/notify',
    'kibana/courier'
  ]);

  module.factory('SavedSearch', function (courier, indexPatterns) {
    function SavedSearch(id) {
      courier.SavedObject.call(this, {
        type: 'search',

        id: id,

        mapping: {
          title: 'string',
          description: 'string',
          hits: 'integer'
        },

        defaults: {
          title: 'New Saved Search',
          description: '',
          hits: 0
        },

        searchSource: true
      });
    }
    inherits(SavedSearch, courier.SavedObject);
    return SavedSearch;
  });
});