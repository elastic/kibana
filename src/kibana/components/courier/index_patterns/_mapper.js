define(function (require) {
  var _ = require('lodash');

  return function MapperService(Private, Promise, es, configFile) {
    var IndexPatternMissingIndices = Private(require('../_errors')).IndexPatternMissingIndices;
    var transformMappingIntoFields = Private(require('./_transform_mapping_into_fields'));

    var LocalCache = Private(require('./_local_cache'));

    function Mapper() {

      // Save a reference to mapper
      var mapper = this;

      // proper-ish cache, keeps a clean copy of the object, only returns copies of it's copy
      var fieldCache = mapper.cache = new LocalCache();

      /**
       * Gets an object containing all fields with their mappings
       * @param {dataSource} dataSource
       * @param {boolean} skipIndexPatternCache - should we ping the index-pattern obejcts? set to true by the indexPattern service
       * @returns {Promise}
       * @async
       */
      mapper.getFieldsForIndexPattern = function (indexPattern, skipIndexPatternCache) {
        var cache;
        if (cache = fieldCache.get(indexPattern)) return Promise.resolve(cache);

        if (!skipIndexPatternCache) {
          return es.get({
            index: configFile.kibanaIndex,
            type: 'index-pattern',
            id: indexPattern,
            _sourceInclude: ['fields']
          })
          .then(function (resp) {
            if (resp.found && resp._source.fields) {
              fieldCache.set(indexPattern, JSON.parse(resp._source.fields));
            }
            return mapper.getFieldsForIndexPattern(indexPattern, true);
          });
        }

        return es.indices.getFieldMapping({
          // TODO: Change index to be the resolved in some way, last three months, last hour, last year, whatever
          index: indexPattern,
          field: '*',
        })
        .catch(function (err) {
          if (err.status >= 400) {
            // transform specific error type
            throw new IndexPatternMissingIndices();
          } else {
            // rethrow all others
            throw err;
          }
        })
        .then(transformMappingIntoFields)
        .then(function (fields) {
          fieldCache.set(indexPattern, fields);
          return fieldCache.get(indexPattern);
        });
      };

      /**
       * Clears mapping caches from elasticsearch and from local object
       * @param {dataSource} dataSource
       * @returns {Promise}
       * @async
       */
      mapper.clearCache = function (indexPattern) {
        fieldCache.clear(indexPattern);
        return Promise.resolve();
      };
    }

    return new Mapper();
  };
});