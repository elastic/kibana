define(function (require) {
  var module = require('modules').get('kibana/index_patterns');

  module.service('indexPatterns', function (configFile, es, Notifier, Private, Promise) {
    var indexPatterns = this;
    var _ = require('lodash');
    var errors = require('errors');

    var IndexPattern = Private(require('components/index_patterns/_index_pattern'));
    var patternCache = Private(require('components/index_patterns/_pattern_cache'));

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

    indexPatterns.ensureSome = Private(require('components/index_patterns/_ensure_some'));
    indexPatterns.cache = patternCache;
    indexPatterns.intervals = Private(require('components/index_patterns/_intervals'));
    indexPatterns.mapper = Private(require('components/index_patterns/_mapper'));
    indexPatterns.patternToWildcard = Private(require('components/index_patterns/_pattern_to_wildcard'));
    indexPatterns.fieldFormats = Private(require('components/index_patterns/_field_formats'));
  });
});