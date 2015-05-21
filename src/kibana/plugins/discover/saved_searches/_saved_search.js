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
          hits: 'long',
          columns: 'string',
          sort: 'string',
          version: 'long'
        },

        defaults: {
          title: 'New Saved Search',
          description: '',
          columns: [],
          hits: 0,
          sort: [],
          version: 1
        },

        searchSource: true
      });
    }

    SavedSearch.type = 'search';

    return SavedSearch;
  });
});
