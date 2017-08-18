import FnTypedObject from '../fn_typed_object.js';

// seriesConfig(series=_all, label="free beer", width=1, color=blue)
export default new FnTypedObject({
  name: 'seriesStyle',
  help: 'Creates an object used for describing the properties of a series on a chart.' +
  ' You would usually use this inside of a charting function',
  args: {
    label: {
      types: ['string'],
      displayName: 'Series Label',
      help: 'The label of the line this style applies to, not the name you would like to give the line.',
    },
    color: {
      types: ['string', 'null'],
      displayName: 'Color',
      help: 'Color to assign the line',
    },
    lines: {
      types: ['number', 'null'],
      displayName: 'Line width',
      help: 'Width of the line',
      default: 0,
    },
    bars: {
      types: ['number', 'null'],
      displayName: 'Bar Width',
      help: 'Width of bars',
      default: 0,
    },
    points: {
      types: ['number', 'null'],
      displayName: 'Show Points',
      help: 'Size of points on line',
      default: 5,
    },
    fill: {
      types: ['boolean', 'null'],
      displayName: 'Fill points',
      help: 'Should we fill points?',
      default: false,
    },
    stack: {
      types: ['boolean', 'null'],
      displayName: 'Stack Series',
      help: 'Should we stack the series?',
      default: false,
    },
  },
});
