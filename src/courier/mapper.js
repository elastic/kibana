define(function (require) {
  /**
   * - Resolves index patterns
   * - Fetches mappings from elasticsearch
   * - casts result object fields using mappings
   *
   * @class Mapper
   */
  function Mapper(client) {

    /**
     * Gets an object containing all fields with their mappings
     * @param {dataSource} [dataSource]
     * @param {Function} [callback] A function to be executed with the results.
     * @param {String} [type]
     * @return {Object} A hash containing fields and their related mapping
     */
    this.getFields = function (dataSource, callback, type) {
      console.log(dataSource);
      client.indices.getFieldMapping({index: dataSource.index}, callback);
    };

    this.getFieldType = function (dataSource, field, type) {
      return field, type;
    };

  }

  return Mapper;
});