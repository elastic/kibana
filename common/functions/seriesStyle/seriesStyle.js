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
    line: {
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
    weight: {
      types: ['number', 'null'],
      help: 'Width of line around points, if any',
      default: 2,
    },
    steps: {
      types: ['boolean', 'null'],
      help: 'Show a stepped line',
    },
    fill: {
      types: ['number', 'null'],
      help: 'A number from 0 to 10 of opacity of the area fill in the line. 0 for no fill, 10 for completely filled',
    },
  },
  fn: (context, args) => {
    return { type: 'seriesStyle', ...args };
  },
});
