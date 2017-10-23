export default {
  name: 'containerStyle',
  aliases: [],
  type: 'containerStyle',
  help: 'Creates an object used for describing the properties of a series on a chart.' +
  ' You would usually use this inside of a charting function',
  args: {
    border: {
      types: ['string', 'null'],
      help: 'Valid CSS border string',
    },
    borderRadius: {
      types: ['string', 'null'],
      help: 'Number of pixels to use when rounding the border',
    },
    padding: {
      types: ['string', 'null'],
      help: 'Content distance in pixels from border',
    },
    backgroundColor: {
      types: ['string', 'null'],
      help: 'Valid CSS background color string',
    },
    backgroundImage: {
      types: ['string', 'null'],
      help: 'Value CSS background image string',
    },
    opacity: {
      types: ['number', 'null'],
      help: 'A number between 0 and 1 representing the degree of transparency of the element',
    },
  },
  fn: (context, args) => {
    return { type: 'containerStyle', ...args };
  },
};
