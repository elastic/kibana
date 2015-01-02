define(function (require) {
  var _ = require('lodash');

  require('components/notify/notify');

  var module = require('modules').get('discover/saved_searches', [
    'kibana/notify',
    'kibana/courier'
  ]);

  module.factory('SavedSearch', function (courier) {
    _(SavedSearch).inherits(courier.SavedObject);
    function SavedSearch(id) {
      courier.SavedObject.call(this, {
        type: SavedSearch.type,

        id: id,

        mapping: {
          title: 'string',
          description: 'string',
          hits: 'integer',
          columns: 'string',
          sort: 'string'
        },

        defaults: {
          title: 'New Saved Search',
          description: '',
          columns: [],
          hits: 0,
          sort: []
        },

        searchSource: true
      });
    }

    SavedSearch.type = 'search';

    return SavedSearch;
  });
});