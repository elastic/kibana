define(function (require) {
  var module = require('modules').get('app/settings');
  var _ = require('lodash');

  module.service('indexPatterns', function (config, es, courier) {
    this.getFields = function (id) {
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
        _sourceExclude: '*',
        body: {
          query: { match_all: {} }
        }
      })
      .then(function (resp) {
        return _.pluck(resp.hits.hits, '_id');
      });
    };

    this.find = function (pattern) {

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