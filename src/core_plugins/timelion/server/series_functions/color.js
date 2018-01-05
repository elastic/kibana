import alter from '../lib/alter.js';
import Chainable from '../lib/classes/chainable';
import tinygradient from 'tinygradient';

export default new Chainable('color', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'color',
      types: ['string'],
      help: 'Color of series, as hex, eg #c6c6c6 is a lovely light grey. If you specify multiple colors, and have ' +
       'multiple series, you will get a gradient, eg "#00B1CC:#00FF94:#FF3A39:#CC1A6F"'
    }
  ],
  help: 'Change the color of the series',
  fn: function colorFn(args) {
    const colors = args.byName.color.split(':');
    const gradientStops = args.byName.inputSeries.list.length;
    let gradient;
    if (colors.length > 1 && gradientStops > 1) {
      // trim number of colors to avoid exception thrown by having more colors than gradient stops
      let trimmedColors = colors;
      if (colors.length > gradientStops) {
        trimmedColors = colors.slice(0, gradientStops);
      }
      gradient = tinygradient(trimmedColors).rgb(gradientStops);
    }

    let i = 0;
    return alter(args, function (eachSeries) {
      if (gradient) {
        eachSeries.color = gradient[i++].toHexString();
      } else if (colors.length === 1) {
        eachSeries.color = colors[0];
      } else {
        throw new Error('color not provided');
      }

      return eachSeries;
    });
  }
});
