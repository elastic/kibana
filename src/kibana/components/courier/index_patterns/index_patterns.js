define(function (require) {
  return function IndexPatternsService(configFile, es, Notifier, Private, Promise) {
    var indexPatterns = this;
    var _ = require('lodash');

    var IndexPattern = Private(require('./_index_pattern'));
    var SourceAbstract = Private(require('../data_source/_abstract'));

    var mapper = Private(require('./_mapper'));
    var errors = Private(require('../_errors'));

    var notify = new Notifier({ location: 'IndexPatterns Service'});

    indexPatterns.get = _.optMemoize(function (id) {
      return (new IndexPattern(id)).init();
    });

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
      return es.delete({
        index: configFile.kibanaIndex,
        type: 'index-pattern',
        id: pattern.id
      });
    };

    indexPatterns.getFieldsFor = function (indexish) {
      // pull the index string out of Source objects
      if (indexish instanceof SourceAbstract) {
        indexish = indexish.get('index');
      }

      return Promise.cast(
        (typeof indexish === 'object')
          ? indexish
          : indexPatterns.get(indexish)
      )
      .then(function (indexPattern) {
        return indexPattern.fields;
      });
    };

    indexPatterns.errors = {
      MissingIndices: errors.IndexPatternMissingIndices
    };
  };
});