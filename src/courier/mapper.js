define(function (require) {
  /**
   * - Resolves index patterns
   * - Fetches mappings from elasticsearch
   * - casts result object fields using mappings
   *
   * @class Mapper
   */
  function Mapper(index, type) {
    this.indices = function () {

    };

    this.getFields = function () {

    };

    this.getFieldType = function (field, type) {
      return field, type;
    };
  }

  return Mapper;
});