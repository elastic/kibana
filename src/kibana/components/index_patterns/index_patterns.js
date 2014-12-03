define(function (require) {
  var module = require('modules').get('kibana/index_patterns');
  require('filters/short_dots');

  module.service('indexPatterns', function (configFile, es, Notifier, Private, Promise) {
    var self = this;
    var _ = require('lodash');
    var errors = require('errors');

    var IndexPattern = Private(require('components/index_patterns/_index_pattern'));
    var patternCache = Private(require('components/index_patterns/_pattern_cache'));

    var notify = new Notifier({ location: 'IndexPatterns Service'});

    self.get = function (id) {
      if (!id) return self.make();

      var cache = patternCache.get(id);
      return cache || patternCache.set(id, self.make(id));
    };

    self.make = function (id) {
      return (new IndexPattern(id)).init();
    };

    self.delete = function (pattern) {
      self.getIds.clearCache();
      patternCache.delete(pattern.id);
      return es.delete({
        index: configFile.kibana_index,
        type: 'index-pattern',
        id: pattern.id
      });
    };

    self.errors = {
      MissingIndices: errors.IndexPatternMissingIndices
    };

    self.cache = patternCache;
    self.getIds = Private(require('components/index_patterns/_get_ids'));
    self.intervals = Private(require('components/index_patterns/_intervals'));
    self.mapper = Private(require('components/index_patterns/_mapper'));
    self.patternToWildcard = Private(require('components/index_patterns/_pattern_to_wildcard'));
    self.fieldFormats = Private(require('components/index_patterns/_field_formats'));
    self.IndexPattern = IndexPattern;
  });
});
