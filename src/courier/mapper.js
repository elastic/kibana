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
     * @param {dataSource} dataSource
     * @param {Number} type
     * @return {Object} A hash containing fields and their related mapping
     */
    this.getFields = function (dataSource, type) {
      return {
        foo: {
          type: 'string'
        },
        'foo.bar': {
          type: 'long'
        }
      };
    };

    this.getFieldType = function (dataSource, field, type) {
      return field, type;
    };

  }

  return Mapper;
});