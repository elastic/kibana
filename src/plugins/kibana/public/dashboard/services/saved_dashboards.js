define(function (require) {
  var module = require('ui/modules').get('app/dashboard');
  var _ = require('lodash');
  // bring in the factory
  require('plugins/kibana/dashboard/services/_saved_dashboard');


  // Register this service with the saved object registry so it can be
  // edited by the object editor.
  require('plugins/kibana/settings/saved_object_registry').register({
    service: 'savedDashboards',
    title: 'dashboards'
  });

  // This is the only thing that gets injected into controllers
  module.service('savedDashboards', function (Promise, SavedDashboard, kbnIndex, es, kbnUrl) {
    this.type = SavedDashboard.type;
    this.Class = SavedDashboard;


    this.loaderProperties = {
      name: 'dashboards',
      noun: 'Dashboard',
      nouns: 'dashboards'
    };

    // Returns a single dashboard by ID, should be the name of the dashboard
    this.get = function (id) {
      // Returns a promise that contains a dashboard which is a subclass of docSource
      return (new SavedDashboard(id)).init();
    };

    this.urlFor = function (id) {
      return kbnUrl.eval('#/dashboard/{{id}}', {id: id});
    };

    this.delete = function (ids) {
      ids = !_.isArray(ids) ? [ids] : ids;
      return Promise.map(ids, function (id) {
        return (new SavedDashboard(id)).delete();
      });
    };

    this.scan = function (pageSize = 100, docCount = 1000) {
      var allResults = {
        hits: [],
        total: 0
      };

      var self = this;
      return new Promise(function (resolve, reject) {
        es.search({
          index: kbnIndex,
          type: 'dashboard',
          size: pageSize,
          body: { query: {match_all: {}}},
          searchType: 'scan',
          scroll: '1m'
        }, function getMoreUntilDone(error, response) {
          var scanAllResults = docCount === Number.POSITIVE_INFINITY;
          allResults.total = scanAllResults ? response.hits.total : Math.min(response.hits.total, docCount);

          var hits = response.hits.hits
          .slice(0, allResults.total - allResults.hits.length)
          .map(self.mapHits.bind(self));
          allResults.hits =  allResults.hits.concat(hits);

          var collectedAllResults = allResults.total === allResults.hits.length;
          if (collectedAllResults) {
            resolve(allResults);
          } else {
            es.scroll({
              scrollId: response._scroll_id,
            }, getMoreUntilDone);
          }
        });
      });
    };

    this.scanAll = function (queryString, pageSize = 100) {
      return this.scan(pageSize, Number.POSITIVE_INFINITY);
    };

    this.mapHits = function (hit) {
      var source = hit._source;
      source.id = hit._id;
      source.url = this.urlFor(hit._id);
      return source;
    };

    this.find = function (searchString, size = 100) {
      var self = this;
      var body;
      if (searchString) {
        body = {
          query: {
            simple_query_string: {
              query: searchString + '*',
              fields: ['title^3', 'description'],
              default_operator: 'AND'
            }
          }
        };
      } else {
        body = { query: {match_all: {}}};
      }

      return es.search({
        index: kbnIndex,
        type: 'dashboard',
        body: body,
        size: size
      })
      .then(function (resp) {
        return {
          total: resp.hits.total,
          hits: resp.hits.hits.map(self.mapHits.bind(self))
        };
      });
    };
  });
});
