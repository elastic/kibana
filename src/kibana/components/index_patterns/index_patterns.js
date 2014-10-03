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

    indexPatterns.delete = function (pattern) {
      indexPatterns.getIds.clearCache();
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

    indexPatterns.cache = patternCache;
    indexPatterns.getIds = Private(require('components/index_patterns/_get_ids'));
    indexPatterns.intervals = Private(require('components/index_patterns/_intervals'));
    indexPatterns.mapper = Private(require('components/index_patterns/_mapper'));
    indexPatterns.patternToWildcard = Private(require('components/index_patterns/_pattern_to_wildcard'));
    indexPatterns.fieldFormats = Private(require('components/index_patterns/_field_formats'));
    indexPatterns.IndexPattern = IndexPattern;
  });
});