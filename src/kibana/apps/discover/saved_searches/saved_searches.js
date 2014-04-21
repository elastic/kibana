define(function (require) {
  var _ = require('lodash');

  require('./_saved_search');
  require('notify/notify');

  var module = require('modules').get('discover/saved_searches', [
    'kibana/notify',
    'kibana/courier'
  ]);

  module.service('savedSearches', function (courier, configFile, es, createNotifier, SavedSearch) {
    var notify = createNotifier({
      location: 'Saved Searches'
    });

    this.get = function (id) {
      return (new SavedSearch(id)).init();
    };

    this.find = function (searchString) {
      return es.search({
        index: configFile.kibanaIndex,
        type: 'search',
        body: {
          query: {
            bool: {
              should : [
                {
                  wildcard: {
                    title: {
                      value: searchString + '*',
                      boost: 3
                    }
                  }
                },
                {
                  wildcard: {
                    description: searchString + '*'
                  }
                },
              ],
            }
          }
        }
      })
      .then(function (resp) {
        return resp.hits.hits.map(function (hit) {
          var source = hit._source;
          source.id = hit._id;
          source.url = '#/discover/' + hit._id;
          return source;
        });
      });
    };
  });
});