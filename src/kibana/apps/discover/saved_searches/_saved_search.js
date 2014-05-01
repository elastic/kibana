define(function (require) {
  var _ = require('lodash');
  var inherits = require('utils/inherits');

  require('notify/notify');

  var module = require('modules').get('discover/saved_searches', [
    'kibana/notify',
    'kibana/courier'
  ]);

  module.factory('SavedSearch', function (configFile, courier, Promise) {
    function SavedSearch(id) {
      courier.SavedObject.call(this, {
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

        searchSource: true,

        afterESResp: function () {
          var index = this.searchSource.get('index');
          if (typeof index === 'string') {
            this.searchSource.index(courier.indexPatterns.get(index));
          }
        }
      });
    }
    inherits(SavedSearch, courier.SavedObject);
    return SavedSearch;
  });
});