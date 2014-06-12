define(function (require) {
  var module = require('modules').get('kibana/index_patterns');

  module.service('indexPatterns', function (configFile, es, Notifier, Private, Promise) {
    var indexPatterns = this;
    var _ = require('lodash');
    var errors = require('errors');

    var IndexPattern = Private(require('./_index_pattern'));
    var patternCache = Private(require('./_pattern_cache'));

    var notify = new Notifier({ location: 'IndexPatterns Service'});

    indexPatterns.get = function (id) {
      var cache = patternCache.get(id);
      return cache || patternCache.set(id, (new IndexPattern(id)).init());
    };

    indexPatterns.getIds = function () {
      return es.search({
        index: configFile.kibanaIndex,
        type: 'index-pattern',
        fields: [],
        body: {
          query: { match_all: {} }
        }
      })
      .then(function (resp) {
        return _.pluck(resp.hits.hits, '_id');
      });
    };

    indexPatterns.delete = function (pattern) {
      patternCache.delete(pattern.id);
      return es.delete({
        index: configFile.kibanaIndex,
        type: 'index-pattern',
        id: pattern.id
      });
    };

    indexPatterns.errors = {
      MissingIndices: errors.IndexPatternMissingIndices
    };

    indexPatterns.ensureSome = Private(require('./_ensure_some'));
    indexPatterns.cache = patternCache;
    indexPatterns.intervals = Private(require('./_intervals'));
    indexPatterns.mapper = Private(require('./_mapper'));
    indexPatterns.patternToWildcard = Private(require('./_pattern_to_wildcard'));
    indexPatterns.fieldFormats = Private(require('./_field_formats'));
  });
});