define(function (require) {
  var _ = require('lodash');
  var inherits = require('lodash').inherits;

  require('components/notify/notify');

  var module = require('modules').get('discover/saved_searches', [
    'kibana/notify',
    'kibana/courier'
  ]);

  module.factory('SavedSearch', function (courier, indexPatterns) {
    _(SavedSearch).inherits(courier.SavedObject);
    function SavedSearch(id) {
      courier.SavedObject.call(this, {
        type: SavedSearch.type,

        id: id,

        mapping: {
          title: 'string',
          description: 'string',
          hits: 'integer',
          columns: 'string'
        },

        defaults: {
          title: 'New Saved Search',
          description: '',
          columns: [],
          hits: 0
        },

        searchSource: true
      });
    }

    SavedSearch.type = 'search';

    return SavedSearch;
  });
});