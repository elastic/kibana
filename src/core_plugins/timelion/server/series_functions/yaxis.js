import _ from 'lodash';
import alter from '../lib/alter.js';
import Chainable from '../lib/classes/chainable';
const tickFormatters = {
  'bits':'bits',
  'bits/s':'bits/s',
  'bytes':'bytes',
  'bytes/s':'bytes/s',
  'currency':'currency(:ISO 4217 currency code)',
  'percent':'percent',
  'custom':'custom(:prefix:suffix)'
};
module.exports = new Chainable('yaxis', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'yaxis',
      types: ['number', 'null'],
      help: 'The numbered y-axis to plot this series on, eg .yaxis(2) for a 2nd y-axis.'
    },
    {
      name: 'min',
      types: ['number', 'null'],
      help: 'Min value'
    },
    {
      name: 'max',
      types: ['number', 'null'],
      help: 'Max value'
    },
    {
      name: 'position',
      types: ['string', 'null'],
      help: 'left or right'
    },
    {
      name: 'label',
      types: ['string', 'null'],
      help: 'Label for axis'
    },
    {
      name: 'color',
      types: ['string', 'null'],
      help: 'Color of axis label'
    },
    {
      name: 'units',
      types: ['string', 'null'],
      help: 'The function to use for formatting y-axis labels. One of: ' + _.values(tickFormatters).join(', ')
    },
  ],
  help: 'Configures a variety of y-axis options, the most important likely being the ability to add an Nth (eg 2nd) y-axis',
  fn: function yaxisFn(args) {
    return alter(args, function (eachSeries, yaxis, min, max, position, label, color, units) {
      yaxis = yaxis || 1;

      eachSeries.yaxis = yaxis;
      eachSeries._global = eachSeries._global || {};

      eachSeries._global.yaxes = eachSeries._global.yaxes || [];
      eachSeries._global.yaxes[yaxis - 1] = eachSeries._global.yaxes[yaxis - 1] || {};

      const myAxis = eachSeries._global.yaxes[yaxis - 1];
      myAxis.position = position || (yaxis % 2 ? 'left' : 'right');
      myAxis.min = min;
      myAxis.max = max;
      myAxis.axisLabelFontSizePixels = 11;
      myAxis.axisLabel = label;
      myAxis.axisLabelColour = color;
      myAxis.axisLabelUseCanvas = true;

      if (units) {
        const unitTokens = units.split(':');
        if (!tickFormatters[unitTokens[0]]) {
          throw new Error (`${units} is not a supported unit type.`);
        }
        if (unitTokens[0] === 'currency') {
          const threeLetterCode = /^[A-Za-z]{3}$/;
          const currency = unitTokens[1];
          if (currency && !threeLetterCode.test(currency)) {
            throw new Error('Currency must be a three letter code');
          }
        }

        myAxis.units = {
          type: unitTokens[0],
          prefix: unitTokens[1] || '',
          suffix: unitTokens[2] || ''
        };
      }

      return eachSeries;
    });
  }
});
