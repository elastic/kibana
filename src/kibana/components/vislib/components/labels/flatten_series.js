define(function (require) {
  return function GetSeriesUtilService() {
    var _ = require('lodash');

    // Accepts a kibana data object
    return function (obj) {
      obj = obj.rows ? obj.rows : obj.columns;

      /*
       * Flattens the obj.rows or obj.columns arrays
       * to an array of d.series objects
       * for example:
       * [
       *    { label: .., values: [...] },
       *    { label: .., values: [...] },
       *    { label: .., values: [...] }
       * ]
       */

      return _.chain(obj)
        .pluck('series')
        .flatten()
        .value();
    };
  };
});
