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
      return new Promise(function (resolve, reject) {

      });
    };

    this.getFields = function () {

    };
  }

  return Mapper;
});