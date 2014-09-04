define(function (require) {
  return function UniqLabelUtilService() {
    var _ = require('lodash');

    // Takes an array of objects
    return function (arr) {
      if (!arr instanceof Array) {
        throw TypeError(arr + ' should be an array of objects');
      }

      // Returns a array of unique chart labels
      return _.uniq(_.pluck(arr, 'label'));
    };
  };
});
