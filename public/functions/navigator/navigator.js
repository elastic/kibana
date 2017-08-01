import Fn from '../../../common/functions/fn.js';

export default new Fn({
  name: 'navigator',
  aliases: [],
  type: 'string',
  help: 'Get a browser property of some sort',
  context: {},
  args: {
    _: {
      name: '_',
      types: [
        'string',
      ],
      'aliases': [],
      'multi': false,
    },
  },
  fn: (context, args) => {
    return navigator[args._];
  },
});
