define(function (require) {
  var _ = require('lodash');

  require('./_saved_search');
  require('notify/notify');

  var module = require('modules').get('discover/saved_searches', [
    'kibana/notify'
  ]);

  // Register this service with the saved object registry so it can be 
  // edited by the object editor.
  require('apps/settings/saved_object_registry').register({
    service: 'savedSearches',
    title: 'Searches'
  });

  module.service('savedSearches', function (config, configFile, es, createNotifier, SavedSearch) {


    var notify = createNotifier({
      location: 'Saved Searches'
    });

    this.get = function (id) {
      return (new SavedSearch(id)).init();
    };

    this.urlFor = function (id) {
      return '#/discover/' + id;
    };

    this.find = function (searchString) {
      var self = this;
      var body = searchString ? {
          query: {
            simple_query_string: {
              query: searchString + '*',
              fields: ['title^3', 'description'],
              default_operator: 'AND'
            }
          }
        }: { query: {match_all: {}}};
      return es.search({
        index: configFile.kibanaIndex,
        type: 'search',
        body: body
      })
      .then(function (resp) {
        return resp.hits.hits.map(function (hit) {
          var source = hit._source;
          source.id = hit._id;
          source.url = self.urlFor(hit._id);
          return source;
        });
      });
    };
  });
});
