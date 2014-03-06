define(function (require) {
  var _ = require('lodash');

  var module = require('modules').get('kibana/services');

  module.service('visualizations', function (courier, es, config, visFactory, $q) {
    this.getOrCreate = function (reject, resolve, id) {
      if (!id) return this.create(id);

      return this.get(id)
        .catch(function (err) {
          return this.create(id);
        });
    };

    this.get = function (id) {
      var defer = $q.defer();

      var settingSource = courier.createSource('doc')
        .index(config.get('visualizations.index'))
        .type(config.get('visualizations.type'))
        .id(id)
        .on('update', function onResult(doc) {
          if (doc.found) {
            // the source will re-emit it's most recent result
            // once "results" is listened for
            defer.resolve(visFactory(settingSource));
          } else {
            defer.reject(new Error('Doc not found'));
          }
        });

      return defer.promise;
    };

    this.create = function (reject, resolve) {
      var defer = $q.defer();

      var docSource = courier.createSource('doc')
        .index(config.get('visualizations.index'))
        .type(config.get('visualizations.type'));

      defer.resolve(visFactory(docSource));
      return defer.promise;
    };

    this.list = function (reject, resolve) {
      return es.search({
        index: config.get('visualizations.index'),
        type: config.get('visualizations.type'),
        body: {
          query: {
            match_all: {}
          }
        }
      }).then(function (resp) {
        return _.map(resp.hits.hits, function (hit) {
          return {
            name: hit._source.title,
            id: hit._id,
            type: hit._source.type
          };
        });
      });
    };

  });
});