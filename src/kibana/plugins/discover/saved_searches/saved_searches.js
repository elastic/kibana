define(function (require) {
  var _ = require('lodash');

  require('plugins/discover/saved_searches/_saved_search');
  require('components/notify/notify');

  var module = require('modules').get('discover/saved_searches', [
    'kibana/notify'
  ]);

  // Register this service with the saved object registry so it can be
  // edited by the object editor.
  require('plugins/settings/saved_object_registry').register({
    service: 'savedSearches',
    title: 'searches'
  });

  module.service('savedSearches', function (Promise, config, configFile, es, createNotifier, SavedSearch, kbnUrl) {


    var notify = createNotifier({
      location: 'Saved Searches'
    });

    this.type = SavedSearch.type;

    this.get = function (id) {
      return (new SavedSearch(id)).init();
    };

    this.urlFor = function (id) {
      return kbnUrl.eval('#/discover/{{id}}', {id: id});
    };

    this.delete = function (ids) {
      ids = !_.isArray(ids) ? [ids] : ids;
      return Promise.map(ids, function (id) {
        return (new SavedSearch(id)).delete();
      });
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
        index: configFile.kibana_index,
        type: 'search',
        body: body,
        size: 100
      })
      .then(function (resp) {
        return {
          total: resp.hits.total,
          hits: resp.hits.hits.map(function (hit) {
            var source = hit._source;
            source.id = hit._id;
            source.url = self.urlFor(hit._id);
            return source;
          })
        };
      });
    };
  });
});
