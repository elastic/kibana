define(function (require) {
  var module = require('modules').get('app/settings');
  var _ = require('lodash');

  module.service('indexPatterns', function (config, es, courier) {
    this.getFields = function (id) {
      if (typeof id === 'object' && typeof id.get === 'function') {
        id = id.get('index');
      }

      return es.get({
        index: config.file.kibanaIndex,
        type: 'mapping',
        id: id
      })
      .then(function (resp) {
        return _.map(resp._source, function (v, k) {
          return {field: k, mapping: v};
        });
      });
    };

    this.getIds = function () {
      return es.search({
        index: config.file.kibanaIndex,
        type: 'mapping',
        fields: [],
        body: {
          query: { match_all: {} }
        }
      })
      .then(function (resp) {
        return _.pluck(resp.hits.hits, '_id');
      });
    };

    this.find = function (searchString) {
      return es.search({
        index: config.file.kibanaIndex,
        type: 'mapping',
        fields: [],
        body: {
          query: {
            multi_match: {
              query: searchString || '',
              type: 'phrase_prefix',
              fields: ['_id'],
              zero_terms_query: 'all'
            }
          }
        }
      })
      .then(function (resp) {
        return resp.hits.hits.map(function (hit) {
          return {
            id: hit._id,
            title: hit._id,
            url: '/settings/indices/' + hit._id
          };
        });
      });
    };

    this.delete = function (pattern) {
      var source = courier.createSource('search').index(pattern);
      return source.clearFieldCache()
      .then(function () {
        return es.indices.refresh({
          index: config.file.kibanaIndex
        });
      })
      .finally(function () {
        source.destroy();
      });
    };

    this.create = function (pattern) {
      var source = courier.createSource('search').index(pattern);
      return source.getFields()
      .then(function (fields) {
        return es.indices.refresh({
          index: config.file.kibanaIndex
        });
      })
      .finally(function () {
        source.destroy();
      });
    };

  });
});