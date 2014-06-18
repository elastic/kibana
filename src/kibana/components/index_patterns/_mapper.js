define(function (require) {
  return function MapperService(Private, Promise, es, configFile) {
    var _ = require('lodash');

    var IndexPatternMissingIndices = require('errors').IndexPatternMissingIndices;
    var transformMappingIntoFields = Private(require('components/index_patterns/_transform_mapping_into_fields'));
    var intervals = Private(require('components/index_patterns/_intervals'));

    var LocalCache = Private(require('components/index_patterns/_local_cache'));

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
        var id = indexPattern.id;
        var indexList = indexPattern.toIndexList(-5, 5);

        var cache = fieldCache.get(id);
        if (cache) return Promise.resolve(cache);

        if (!skipIndexPatternCache) {
          return es.get({
            index: configFile.kibanaIndex,
            type: 'index-pattern',
            id: id,
            _sourceInclude: ['fields']
          })
          .then(function (resp) {
            if (resp.found && resp._source.fields) {
              fieldCache.set(id, JSON.parse(resp._source.fields));
            }
            return mapper.getFieldsForIndexPattern(indexPattern, true);
          });
        }

        return es.indices.getFieldMapping({
          // TODO: Change index to be the resolved in some way, last three months, last hour, last year, whatever
          index: indexList,
          field: '*',
          ignoreUnavailable: _.isArray(indexList),
          allowNoIndices: false,
          includeDefaults: true
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
          fieldCache.set(id, fields);
          return fieldCache.get(id);
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