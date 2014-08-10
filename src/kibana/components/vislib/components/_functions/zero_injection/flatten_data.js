define(function (require) {
  return function FlattenDataObjectUtilService() {
    var _ = require('lodash');

    // Takes a kibana data.series array of objects
    return function (arr) {
      // Returns an array of objects
      /*
       * [
       *    { x: ..., y: ...},
       *    { x: ..., y: ...},
       *    { x: ..., y: ...}
       * ]
       */
      return _.flatten(arr, 'values');
    };
  };
});