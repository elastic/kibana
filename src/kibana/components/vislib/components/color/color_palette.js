define(function (require) {
  return function ColorPaletteUtilService(d3, Private) {
    var _ = require('lodash');

    var seedColors = Private(require('components/vislib/components/color/seed_colors'));

    // Accepts a number that represents a length of an array
    return function (num) {
      var usedColors = [];

      // checks if more colors are needed
      var diff = num - seedColors.length;

      if (diff > 0) {
        // generate more colors
        usedColors = _.clone(seedColors);

        for (var newColor, i = 0; i < diff; i++) {
          newColor = d3.rgb(usedColors[i])
            .darker(1.3)
            .toString();

          usedColors.push(newColor);
        }
      } else {
        // trim to length of array labels
        usedColors = _.first(seedColors, num);
      }

      // Returns an array of hex colors
      // Returned array should be same length as input (num).
      return usedColors;
    };
  };
});
