define(function (require) {
  return function ColorUtilService(Private) {
    var _ = require('lodash');

    var createColorPalette = Private(require('components/vislib/components/color/color_palette'));

    /*
     * Accepts an array of strings or numbers that are used to create a
     * a lookup table that associates the values (key) with a hex color (value).
     * Returns a function that accepts a value (i.e. a string or number)
     * and returns a hex color associated with that value.
     */

    return function (arrayOfStringsOrNumbers) {
      if (!_.isArray(arrayOfStringsOrNumbers)) {
        throw new Error('ColorUtil expects an array');
      }

      arrayOfStringsOrNumbers.forEach(function (val) {
        if (!_.isString(val) && !_.isNumber(val) && !_.isUndefined(val)) {
          throw new TypeError('ColorUtil expects an array of strings, numbers, or undefined values');
        }
      });

      var arrayLength = arrayOfStringsOrNumbers.length;
      var colorObj = _.zipObject(arrayOfStringsOrNumbers, createColorPalette(arrayLength));

      return function (value) {
        return colorObj[value];
      };
    };
  };
});