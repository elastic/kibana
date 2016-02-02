define(function (require) {
  const _ = require('lodash');

  require('ui/notify');

  const module = require('ui/modules').get('discover/saved_searches', [
    'kibana/notify',
    'kibana/courier'
  ]);

  module.factory('SavedSearch', function (courier) {
    _.class(SavedSearch).inherits(courier.SavedObject);
    function SavedSearch(id) {
      courier.SavedObject.call(this, {
        type: SavedSearch.type,
        mapping: SavedSearch.mapping,
        searchSource: SavedSearch.searchSource,

        id: id,
        defaults: {
          title: 'New Saved Search',
          description: '',
          columns: [],
          hits: 0,
          sort: [],
          version: 1
        }
      });
    }

    SavedSearch.type = 'search';

    SavedSearch.mapping = {
      title: 'string',
      description: 'string',
      hits: 'integer',
      columns: 'string',
      sort: 'string',
      version: 'integer'
    };

    SavedSearch.searchSource = true;

    return SavedSearch;
  });
});
