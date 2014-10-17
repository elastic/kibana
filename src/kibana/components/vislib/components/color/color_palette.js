define(function (require) {
  return function ColorPaletteUtilService(d3, Private) {
    var _ = require('lodash');

    var seedColors = Private(require('components/vislib/components/color/seed_colors'));

    /*
     * Generates an array of hex colors the length of the input number.
     * If the number is greater than the length of seed colors available,
     * new colors are generated up to the value of the input number.
     */

    return function (num) {
      if (!_.isNumber(num)) {
        throw new TypeError('ColorPaletteUtilService expects a number');
      }

      var usedColors = [];
      var diff = num - seedColors.length;

      if (diff > 0) {
        usedColors = _.clone(seedColors);

        for (var newColor, i = 0; i < diff; i++) {
          newColor = d3.rgb(usedColors[i])
            .darker(1.3)
            .toString();

          usedColors.push(newColor);
        }
      } else {
        usedColors = _.first(seedColors, num);
      }

      return usedColors;
    };
  };
});
