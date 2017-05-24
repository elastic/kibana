const Fn = require('../fn.js');

// seriesConfig(series=_all, label="free beer", width=1, color=blue)
module.exports = new Fn({
  name: 'seriesStyle',
  aliases: [],
  type: 'seriesStyle',
  help: 'Creates an object used for describing the properties of a series on a chart.' +
  ' You would usually use this inside of a charting function',
  context: {
    types: [
      'pointseries',
    ],
  },
  args: {
    label: {
      types: ['string'],
      help: 'The label of the line this style applies to, not the name you would like to give the line.',
    },
    color: {
      types: ['string', 'null'],
      help: 'Color to assign the line',
    },
    lines: {
      types: ['number', 'null'],
      help: 'Width of the line',
      default: 2,
    },
    bars: {
      types: ['number', 'null'],
      help: 'Width of bars',
      default: 0,
    },
    points: {
      types: ['number', 'null'],
      help: 'Size of points on line',
      default: 0,
    },
    fill: {
      types: ['boolean', 'null'],
      help: 'Should we fill points?',
      default: false,
    },
    stack: {
      types: ['boolean', 'null'],
      help: 'Should we stack the series?',
      default: false,
    },
  },
  fn: (context, args) => {
    return { type: 'seriesStyle', ...args };
  },
});
