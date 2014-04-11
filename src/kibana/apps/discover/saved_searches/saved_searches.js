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
      var query = !searchString ? { match_all: {} } : {
        fuzzy_like_this : {
          fields: ['title', 'description'],
          like_text: searchString,
          fuzziness: 2,
          max_query_terms: 12
        }
      };

      return es.search({
        index: configFile.kibanaIndex,
        type: 'search',
        body: {
          query: query
        }
      })
      .then(function (resp) {
        return resp.hits.hits.map(function (hit) {
          var source = hit._source;
          source.url = '/discover/' + hit._id;
          return source;
        });
      });
    };
  });
});