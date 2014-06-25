define(function (require) {
  var _ = require('lodash');
  var inherits = require('utils/inherits');

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

        searchSource: true,

        afterESResp: function () {
          var obj = this;

          return indexPatterns.get(obj.searchSource.get('index'))
          .then(function (indexPattern) {
            obj.searchSource.index(indexPattern);
          });
        }
      });
    }
    inherits(SavedSearch, courier.SavedObject);
    return SavedSearch;
  });
});