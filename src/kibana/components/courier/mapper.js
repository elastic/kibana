define(function (require) {
  var _ = require('lodash');

  require('./local_cache');

  // these fields are the only _ prefixed fields that will
  // be found in the field list. All others are filtered
  var reservedFields = {
    _id: { type: 'string' },
    _type: { type: 'string' },
    _index: { type: 'string' }
  };

  var module = require('modules').get('courier/mapper');

  module.factory('CouriersMapper', function (Promise, es, configFile, LocalCache, couriersErrors) {
    var CacheWriteFailure = couriersErrors.CacheWriteFailure;
    var MappingConflict = couriersErrors.MappingConflict;
    var RestrictedMapping = couriersErrors.RestrictedMapping;
    var FieldNotFoundInCache = couriersErrors.FieldNotFoundInCache;

    function CouriersMapper(courier) {

      // Save a reference to mapper
      var mapper = this;

      var fieldCache = new LocalCache({
        id: function (dataSource) {
          return dataSource.get('index');
        }
      });

      /**
       * Gets an object containing all fields with their mappings
       * @param {dataSource} dataSource
       * @async
       */
      mapper.getFields = function (dataSource) {
        if (!dataSource.get('index')) {
          // always callback async
          return Promise.rejected(new TypeError('dataSource must have an index before it\'s fields can be fetched'));
        }

        return mapper.getCachedFieldsFor(dataSource)
        .catch(function () {
          // If we are unable to get the fields from cache, get them from mapping instead
          return mapper.getFieldsFromEsFor(dataSource)
          .then(function (fields) {
            fieldCache.set(dataSource, fields);
          });
        });
      };

      /**
       * Gets an object containing all fields with their mappings from kibana's cache in Elasticsearch
       * @param {dataSource} dataSource
       * @param {Function} callback A function to be executed with the results.
       */
      mapper.getCachedFieldsFor = function (dataSource) {
        // If we already have the fields in the local cache, use those
        var cached = fieldCache.get(dataSource);
        if (cached) return Promise.resolved(cached);

        return es.getSource({
          index: configFile.kibanaIndex,
          type: 'mapping',
          id: dataSource.get('index'),
        }).then(function (fields) {
          fieldCache.set(dataSource, fields);
          return fieldCache.get(dataSource);
        });
      };

      /**
       * Gets an object containing all fields with their mappings directly from Elasticsearch _mapping API
       * @param {dataSource} dataSource
       * @param {Function} callback A function to be executed with the results.
       */
      mapper.getFieldsFromEsFor = function (dataSource, callback) {
        return es.indices.getFieldMapping({
          // TODO: Change index to be the resolved in some way, last three months, last hour, last year, whatever
          index: dataSource.get('index'),
          field: '*',
        })
        .then(transformFieldMappingResponse)
        .then(function (fields) {
          return mapper.writeFieldsToCaches(dataSource, fields);
        })
        .then(function () {
          return fieldCache.get(dataSource);
        });
      };

      /**
       * Stores processed mappings in Elasticsearch, and in local cache
       * @param {dataSource} dataSource
       * @param {Function} callback A function to be executed with the results.
       * @async
       */
      mapper.writeFieldsToCaches = function (dataSource, fields) {
        return es.index({
          index: configFile.kibanaIndex,
          type: 'mapping',
          id: dataSource.get('index'),
          body: fields
        })
        .then(function () {
          fieldCache.set(dataSource, fields);
        });
      };

      /**
       * Clears mapping caches from elasticsearch and from local object
       * @param {dataSource} dataSource
       * @param {Function} callback A function to be executed with the results.
       */
      mapper.clearCache = function (dataSource) {
        fieldCache.clear(dataSource);
        return es.delete({
          index: configFile.kibanaIndex,
          type: 'mapping',
          id: dataSource.get('index')
        });
      };

      /**
       * Convert the ES response into the simple map for fields to
       * mappings which we will cache
       *
       * @param  {object} response - complex, excessively nested
       *                           object returned from ES
       * @return {object} - simple object that works for all of kibana
       *                    use-cases
       */
      var transformFieldMappingResponse = function (response) {
        var fields = _.cloneDeep(reservedFields);
        _.each(response, function (index, indexName) {
          if (indexName === configFile.kibanaIndex) return;
          _.each(index.mappings, function (mappings, typeName) {
            _.each(mappings, function (field, name) {
              if (_.size(field.mapping) === 0 || name[0] === '_') return;

              var mapping = field.mapping[_.keys(field.mapping)[0]];
              mapping.type = castMappingType(mapping.type);

              if (fields[name]) {
                if (fields[name].type !== mapping.type) {
                  throw new MappingConflict(name);
                }
                return;
              }

              fields[name] = mapping;
            });
          });
        });
        return fields;
      };

      /**
       * Accepts a mapping type, and converts it into it's js equivilent
       * @param  {String} type - the type from the mapping's 'type' field
       * @return {String} - the most specific type that we care for
       */
      var castMappingType = function (type) {
        switch (type) {
        case 'float':
        case 'double':
        case 'integer':
        case 'long':
        case 'short':
        case 'byte':
        case 'token_count':
          return 'number';
        case 'date':
        case 'boolean':
        case 'ip':
        case 'attachment':
        case 'geo_point':
        case 'geo_shape':
          return type;
        default: // including 'string'
          return 'string';
        }
      };
    }

    return CouriersMapper;
  });
});
