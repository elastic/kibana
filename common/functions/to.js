import { castProvider } from '../interpreter/cast';

export const to = () => ({
  name: 'to',
  aliases: [],
  help: 'Explicitly cast from one type to another.',
  context: {},
  args: {
    _: {
      types: ['string'],
      help: 'A known type',
      aliases: ['type'],
      multi: true,
    },
  },
  fn: (context, args, { types }) => {
    if (!args._) throw new Error('Must specify a casting type');

    return castProvider(types)(context, args._);
  },
});
