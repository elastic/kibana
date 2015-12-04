define(function (require) {
  var app = require('ui/modules').get('app/visualize');
  var _ = require('lodash');

  require('plugins/kibana/visualize/saved_visualizations/_saved_vis');

  // Register this service with the saved object registry so it can be
  // edited by the object editor.
  require('plugins/kibana/settings/saved_object_registry').register({
    service: 'savedVisualizations',
    title: 'visualizations'
  });

  app.service('savedVisualizations', function (Promise, es, kbnIndex, SavedVis, Private, Notifier, kbnUrl) {
    var visTypes = Private(require('ui/registry/vis_types'));
    var notify = new Notifier({
      location: 'Saved Visualization Service'
    });

    this.type = SavedVis.type;
    this.Class = SavedVis;

    this.loaderProperties = {
      name: 'visualizations',
      noun: 'Visualization',
      nouns: 'visualizations'
    };

    this.get = function (id) {
      return (new SavedVis(id)).init();
    };

    this.urlFor = function (id) {
      return kbnUrl.eval('#/visualize/edit/{{id}}', {id: id});
    };

    this.delete = function (ids) {
      ids = !_.isArray(ids) ? [ids] : ids;
      return Promise.map(ids, function (id) {
        return (new SavedVis(id)).delete();
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
          type: 'visualization',
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

      var typeName = source.typeName;
      if (source.visState) {
        try { typeName = JSON.parse(source.visState).type; }
        catch (e) { /* missing typename handled below */ } // eslint-disable-line no-empty
      }

      if (!typeName || !visTypes.byName[typeName]) {
        if (!typeName) notify.error('Visualization type is missing. Please add a type to this visualization.', hit);
        else notify.error('Visualization type of "' + typeName + '" is invalid. Please change to a valid type.', hit);
        return kbnUrl.redirect('/settings/objects/savedVisualizations/{{id}}', {id: source.id});
      }

      source.type = visTypes.byName[typeName];
      source.icon = source.type.icon;
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
        type: 'visualization',
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
