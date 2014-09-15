define(function (require) {
  return function ColorObjUtilService() {
    var _ = require('lodash');

    // Accepts 2 arrays of strings or numbers
    return function (arr1, arr2) {
      // Returns an object with arr1 values as keys
      // and arr2 values as values
      return _.zipObject(arr1, arr2);
    };
  };
});
