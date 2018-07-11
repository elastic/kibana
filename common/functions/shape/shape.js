export const shape = () => ({
  name: 'shape',
  aliases: [],
  type: 'shape',
  help: 'Create a shape',
  context: {
    types: ['null'],
  },
  args: {
    _: {
      types: ['string', 'null'],
      help: 'Pick a shape',
      aliases: ['shape'],
      default: 'square',
    },
    fill: {
      types: ['string', 'null'],
      help: 'Valid CSS color string',
      default: 'black',
    },
    border: {
      types: ['string', 'null'],
      aliases: ['stroke'],
      help: 'Valid CSS color string',
    },
    borderWidth: {
      types: ['number', 'null'],
      aliases: ['strokeWidth'],
      help: 'Thickness of the border',
      default: '0',
    },
    maintainAspect: {
      types: ['boolean'],
      help: 'Select true to maintain aspect ratio',
      default: false,
    },
  },
  fn: (context, { _, fill, border, borderWidth, maintainAspect }) => ({
    type: 'shape',
    shape: _,
    fill,
    border,
    borderWidth,
    maintainAspect,
  }),
});
