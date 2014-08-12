define(function (require) {
  return function FlattenDataObjectUtilService() {
    var _ = require('lodash');

    // Takes a kibana data.series array of objects
    return function (obj) {
      if (!obj.series) {
        obj = obj.rows ? obj.rows : obj.columns;

        return _.chain(obj)
          .pluck('series')
          .flatten()
          .pluck('values')
          .flatten()
          .value();
      }

      // Returns an array of objects
      /*
       * [
       *    { x: ..., y: ...},
       *    { x: ..., y: ...},
       *    { x: ..., y: ...}
       * ]
       */
      return _.flatten(obj.series, 'values');
    };
  };
});