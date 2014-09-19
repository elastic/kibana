define(function (require) {
  return function UniqLabelUtilService() {
    var _ = require('lodash');

    // Takes an array of objects
    return function (arr) {
      if (!_.isArray(arr)) {
        throw TypeError('UniqLabelUtil expects an array of objects');
      }

      // Returns a array of unique chart labels
      return _.uniq(_.pluck(arr, 'label'));
    };
  };
});
