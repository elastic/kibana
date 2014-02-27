define(function (require) {
  var _ = require('lodash');
  var Error = require('courier/errors');
  var nextTick = require('utils/next_tick');

  /**
   * - Resolves index patterns
   * - Fetches mappings from elasticsearch
   * - casts result object fields using mappings
   *
   * @class Mapper
   */
  function Mapper(courier, config) {

    // Exclude anything wirh empty mapping except these
    var reservedFields = {
      '_id': { type: 'string' },
      '_type': { type: 'string' },
      '_index': { type: 'string' }
    };

    // Save a reference to this
    var self = this;

    config = _.defaults(config || {}, {
      cacheIndex: 'kibana4-int',
      cacheType: 'mappings'
    });

    // Store mappings we've already loaded from Elasticsearch
    var mappings = {};

    /**
     * Gets an object containing all fields with their mappings
     * @param {dataSource} dataSource
     * @param {Function} callback A function to be executed with the results.
     */
    this.getFields = function (dataSource, callback) {
      if (self.getFieldsFromObject(dataSource)) {
        // If we already have the fields in our object, use that, but
        // make sure we stay async and
        nextTick(callback, void 0, self.getFieldsFromObject(dataSource));
      } else {
        // Otherwise, try to get fields from Elasticsearch cache
        self.getFieldsFromCache(dataSource, function (err, fields) {
          if (err) {
            // If we are unable to get the fields from cache, get them from mapping
            self.getFieldsFromMapping(dataSource, function (err, fields) {
              if (err) return courier._error(err);

              // And then cache them
              cacheFieldsToElasticsearch(config, dataSource._state.index, fields, function (err, response) {
                if (err) return courier._error(new Error.CacheWriteError());
              });

              cacheFieldsToObject(dataSource, fields);
              callback(err, self.getFieldsFromObject(dataSource));
            });
          } else {
            cacheFieldsToObject(dataSource, fields);
            callback(err, self.getFieldsFromObject(dataSource));
          }
        });
      }
    };

    /**
     * Gets an object containing the mapping for a field
     * @param {dataSource} dataSource
     * @param {String} field The dot notated name of a field to get the mapping for
     * @param {Function} callback A function to be executed with the results.
     */
    this.getFieldMapping = function (dataSource, field, callback) {
      self.getFields(dataSource, function (err, fields) {
        if (_.isUndefined(fields[field])) return courier._error(new Error.FieldNotFoundInCache(field));
        callback(err, fields[field]);
      });
    };

    /**
     * Gets an object containing the mapping for a field
     * @param {dataSource} dataSource
     * @param {Array} fields The dot notated names of a fields to get the mapping for
     * @param {Function} callback A function to be executed with the results.
     */
    this.getFieldsMapping = function (dataSource, fields, callback) {
      self.getFields(dataSource, function (err, fields) {
        var _mapping = _.object(_.map(fields, function (field) {
          if (_.isUndefined(fields[field])) return courier._error(new Error.FieldNotFoundInCache(field));
          return [field, fields[field]];
        }));
        callback(err, _mapping);
      });
    };

    /**
     * Gets an object containing all fields with their mappings from kibana's cache in Elasticsearch
     * @param {dataSource} dataSource
     * @return {Object} An object containing fields with their mappings, or false if not found.
     */
    this.getFieldsFromObject = function (dataSource) {
      // don't pass pack our reference to truth, clone it
      return !_.isUndefined(mappings[dataSource._state.index]) ? _.clone(mappings[dataSource._state.index]) : false;
    };

    /**
     * Gets an object containing all fields with their mappings from kibana's cache in Elasticsearch
     * @param {dataSource} dataSource
     * @param {Function} callback A function to be executed with the results.
     */
    this.getFieldsFromCache = function (dataSource, callback) {
      var client = courier._getClient();
      var params = {
        index: config.cacheIndex,
        type: config.cacheType,
        id: dataSource._state.index,
      };

      client.getSource(params, callback);
    };

    /**
     * Gets an object containing all fields with their mappings directly from Elasticsearch
     * @param {dataSource} dataSource
     * @param {Function} callback A function to be executed with the results.
     */
    this.getFieldsFromMapping = function (dataSource, callback) {
      var client = courier._getClient();
      var params = {
        // TODO: Change index to be newest resolved index. Change _state.index to id().
        index: dataSource._state.index,
        field: '*',
      };

      // TODO: Add week/month check
      client.indices.getFieldMapping(params, function (err, response, status) {
        var fields = {};

        _.each(response, function (index, indexName) {
          if (indexName === config.cacheIndex) return;
          _.each(index.mappings, function (type) {
            _.each(type, function (field, name) {
              if (_.size(field.mapping) === 0 || name[0] === '_') return;

              var mapping = field.mapping[_.keys(field.mapping)[0]];
              mapping.type = castMappingType(mapping.type);

              if (fields[name]) {
                if (fields[name].type === mapping.type) return;
                return courier._error(new Error.MappingConflict(name));
              }

              fields[name] = field.mapping[_.keys(field.mapping)[0]];
            });
          });
        });

        // TODO if these are mapped differently this might cause problems
        _.assign(fields, reservedFields);

        callback(err, fields);
      });
    };

    /**
     * Stores processed mappings in Elasticsearch
     * @param {dataSource} dataSource
     * @param {Function} callback A function to be executed with the results.
     */
    var cacheFieldsToElasticsearch = function (config, index, fields, callback) {
      var client = courier._getClient();

      client.index({
        index: config.cacheIndex,
        type: config.cacheType,
        id: index,
        body: fields
      }, callback);
    };

    /**
     * Stores processed mappings in an object
     * @param {dataSource} dataSource
     * @param {Function} callback A function to be executed with the results.
     */
    var cacheFieldsToObject = function (dataSource, fields) {
      mappings[dataSource._state.index] = fields;
      return !_.isUndefined(mappings[dataSource._state.index]) ? true : false;
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

    /**
     * Clears mapping caches from elasticsearch and from local object
     * @param {dataSource} dataSource
     * @param {Function} callback A function to be executed with the results.
     */
    this.clearCache = function (dataSource, callback) {
      var client = courier._getClient();

      if (!_.isUndefined(mappings[dataSource._state.index])) {
        delete mappings[dataSource._state.index];
      }
      client.delete({
        index: config.cacheIndex,
        type: config.cacheType,
        id: dataSource._state.index
      }, callback);
    };


    /**
     * Sets a number of fields to be ignored in the mapping. Not sure this is a good idea?
     * @param {dataSource} dataSource
     * @param {Array} fields An array of fields to be ignored
     * @param {Function} callback A function to be executed with the results.
     */
    this.ignoreFields = function (dataSource, fields, callback) {
      if (!_.isArray(fields)) fields = [fields];
      var ignore = _.object(_.map(fields, function (field) {
        return [field, {type: 'ignore'}];
      }));
      self.getFields(dataSource, function (err, mapping) {
        _.assign(mapping, ignore);
        callback(err, mapping);
      });
    };

  }

  return Mapper;
});