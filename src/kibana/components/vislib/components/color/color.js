define(function (require) {
  return function ColorUtilService(Private) {
    var _ = require('lodash');

    var createColorPalette = Private(require('components/vislib/components/color/color_palette'));

    /*
     * Accepts an array of strings or numbers that are used to create a
     * a lookup table that associates the values (key) with a hex color (value).
     * Returns a function that accepts a value (i.e. a string or number)
     * and returns a hex color associated with that value
     */

    return function (arrayOfStringsOrNumbers) {
      // Takes an array of strings or numbers
      if (!_.isArray(arrayOfStringsOrNumbers)) {
        throw new Error('ColorUtil expects an array of strings or numbers');
      }

      // Creates lookup table of values (keys) and hex colors (values).
      var colorObj = _.zipObject(arrayOfStringsOrNumbers, createColorPalette(arrayOfStringsOrNumbers.length));

      return function (value) {
        return colorObj[value];
      };
    };
  };
});