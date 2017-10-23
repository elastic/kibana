export default {
  name: 'size',
  aliases: [],
  type: 'filter',
  help: 'Set the number of records a datasource should retrieve',
  context: {
    types: [
      'filter',
    ],
  },
  args: {
    _: {
      types: ['number'],
      help: 'Record count to bring back',
    },
  },
  fn: (context, args) => Object.assign({}, context, { size: args._ }),
};
