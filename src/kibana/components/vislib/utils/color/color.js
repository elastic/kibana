define(function (require) {
  return function ColorUtilService(Private) {
    var createColorPalette = Private(require('components/vislib/utils/color/color_palette'));
    var createColorObj = Private(require('components/vislib/utils/color/color_obj'));

    // Takes an array of strings or numbers
    return function (arr) {
      if (!arr instanceof Array) {
        throw new Error(typeof arr + ' should be an array of strings or numbers');
      }

      var colorObj = createColorObj(arr, createColorPalette(arr.length));

      // Returns a function that accepts a value (i.e. a string or number)
      // and returns a hex color from the colorObj
      return function (value) {
        return colorObj[value];
      };
    };
  };
});